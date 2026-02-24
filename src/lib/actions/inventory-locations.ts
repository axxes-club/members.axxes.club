"use server"

import { db } from "@/lib/db"
import { inventoryLocations, inventoryLevels, locationBins } from "@/lib/db/schema"
import { eq, and, desc, asc, sql, ilike, or, isNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getAuthContext } from "@/lib/auth"

// ============= INVENTORY LOCATIONS =============

const locationSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  code: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

export type LocationFormData = z.infer<typeof locationSchema>

async function getTenantId() {
  return getAuthContext()
}

export async function getLocations({
  search,
  sortBy = "name",
  sortOrder = "asc",
  page = 1,
  limit = 20,
  activeOnly = false,
}: {
  search?: string
  sortBy?: "name" | "createdAt"
  sortOrder?: "asc" | "desc"
  page?: number
  limit?: number
  activeOnly?: boolean
} = {}) {
  const { tenantId } = await getTenantId()

  const conditions = [
    eq(inventoryLocations.tenantId, tenantId),
    isNull(inventoryLocations.deletedAt),
  ]

  if (activeOnly) {
    conditions.push(eq(inventoryLocations.isActive, true))
  }

  if (search) {
    conditions.push(
      or(
        ilike(inventoryLocations.name, `%${search}%`),
        ilike(inventoryLocations.code, `%${search}%`),
        ilike(inventoryLocations.city, `%${search}%`)
      )!
    )
  }

  const orderColumn = {
    name: inventoryLocations.name,
    createdAt: inventoryLocations.createdAt,
  }[sortBy]

  const orderFn = sortOrder === "asc" ? asc : desc

  const [locationList, countResult] = await Promise.all([
    db.query.inventoryLocations.findMany({
      where: and(...conditions),
      orderBy: [orderFn(orderColumn)],
      limit,
      offset: (page - 1) * limit,
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryLocations)
      .where(and(...conditions)),
  ])

  return {
    locations: locationList,
    total: Number(countResult[0].count),
    page,
    limit,
    totalPages: Math.ceil(Number(countResult[0].count) / limit),
  }
}

export async function getLocation(id: string) {
  const { tenantId } = await getTenantId()

  const location = await db.query.inventoryLocations.findFirst({
    where: and(
      eq(inventoryLocations.id, id),
      eq(inventoryLocations.tenantId, tenantId),
      isNull(inventoryLocations.deletedAt)
    ),
    with: {
      inventoryLevels: {
        limit: 10,
      },
    },
  })

  if (!location) {
    throw new Error("Location not found")
  }

  return location
}

export async function createLocation(data: LocationFormData) {
  const { tenantId } = await getTenantId()

  const parsed = locationSchema.parse(data)

  // If this is set as default, unset any existing default
  if (parsed.isDefault) {
    await db
      .update(inventoryLocations)
      .set({ isDefault: false })
      .where(
        and(
          eq(inventoryLocations.tenantId, tenantId),
          eq(inventoryLocations.isDefault, true)
        )
      )
  }

  const [location] = await db
    .insert(inventoryLocations)
    .values({
      tenantId,
      name: parsed.name,
      code: parsed.code || null,
      addressLine1: parsed.addressLine1 || null,
      addressLine2: parsed.addressLine2 || null,
      city: parsed.city || null,
      state: parsed.state || null,
      postalCode: parsed.postalCode || null,
      country: parsed.country || "US",
      isDefault: parsed.isDefault ?? false,
      isActive: parsed.isActive ?? true,
    })
    .returning()

  revalidatePath("/inventory/locations")
  return location
}

export async function updateLocation(id: string, data: Partial<LocationFormData>) {
  const { tenantId } = await getTenantId()

  // If this is set as default, unset any existing default
  if (data.isDefault) {
    await db
      .update(inventoryLocations)
      .set({ isDefault: false })
      .where(
        and(
          eq(inventoryLocations.tenantId, tenantId),
          eq(inventoryLocations.isDefault, true)
        )
      )
  }

  const [location] = await db
    .update(inventoryLocations)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(inventoryLocations.id, id),
        eq(inventoryLocations.tenantId, tenantId)
      )
    )
    .returning()

  if (!location) {
    throw new Error("Location not found")
  }

  revalidatePath("/inventory/locations")
  revalidatePath(`/inventory/locations/${id}`)
  return location
}

export async function deleteLocation(id: string) {
  const { tenantId } = await getTenantId()

  await db
    .update(inventoryLocations)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(inventoryLocations.id, id),
        eq(inventoryLocations.tenantId, tenantId)
      )
    )

  revalidatePath("/inventory/locations")
}

export async function getLocationStats() {
  const { tenantId } = await getTenantId()

  const [total, active, defaultLocation] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryLocations)
      .where(
        and(
          eq(inventoryLocations.tenantId, tenantId),
          isNull(inventoryLocations.deletedAt)
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryLocations)
      .where(
        and(
          eq(inventoryLocations.tenantId, tenantId),
          eq(inventoryLocations.isActive, true),
          isNull(inventoryLocations.deletedAt)
        )
      ),
    db.query.inventoryLocations.findFirst({
      where: and(
        eq(inventoryLocations.tenantId, tenantId),
        eq(inventoryLocations.isDefault, true),
        isNull(inventoryLocations.deletedAt)
      ),
    }),
  ])

  // Get total inventory across all locations
  const inventoryTotal = await db
    .select({ total: sql<number>`COALESCE(SUM(${inventoryLevels.quantityOnHand}), 0)` })
    .from(inventoryLevels)
    .innerJoin(inventoryLocations, eq(inventoryLevels.locationId, inventoryLocations.id))
    .where(
      and(
        eq(inventoryLocations.tenantId, tenantId),
        isNull(inventoryLocations.deletedAt)
      )
    )

  return {
    total: Number(total[0].count),
    active: Number(active[0].count),
    totalInventory: Number(inventoryTotal[0]?.total || 0),
    defaultLocation: defaultLocation?.name || null,
  }
}

// ============= LOCATION BINS =============

const binSchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  zone: z.string().optional(),
  aisle: z.string().optional(),
  rack: z.string().optional(),
  shelf: z.string().optional(),
  bin: z.string().optional(),
  binType: z.string().optional(),
  isActive: z.boolean().optional(),
})

export type BinFormData = z.infer<typeof binSchema>

export async function getBins({
  locationId,
  page = 1,
  limit = 50,
}: {
  locationId: string
  page?: number
  limit?: number
}) {
  const { tenantId } = await getTenantId()

  // Verify location belongs to tenant
  const location = await db.query.inventoryLocations.findFirst({
    where: and(
      eq(inventoryLocations.id, locationId),
      eq(inventoryLocations.tenantId, tenantId)
    ),
  })

  if (!location) {
    throw new Error("Location not found")
  }

  const [bins, countResult] = await Promise.all([
    db.query.locationBins.findMany({
      where: eq(locationBins.locationId, locationId),
      limit,
      offset: (page - 1) * limit,
      orderBy: [asc(locationBins.zone), asc(locationBins.aisle), asc(locationBins.rack)],
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(locationBins)
      .where(eq(locationBins.locationId, locationId)),
  ])

  return {
    bins,
    total: Number(countResult[0].count),
    page,
    limit,
    totalPages: Math.ceil(Number(countResult[0].count) / limit),
  }
}

export async function createBin(data: BinFormData) {
  const { tenantId } = await getTenantId()

  const parsed = binSchema.parse(data)

  // Verify location belongs to tenant
  const location = await db.query.inventoryLocations.findFirst({
    where: and(
      eq(inventoryLocations.id, parsed.locationId),
      eq(inventoryLocations.tenantId, tenantId)
    ),
  })

  if (!location) {
    throw new Error("Location not found")
  }

  const [bin] = await db
    .insert(locationBins)
    .values({
      tenantId,
      locationId: parsed.locationId,
      zone: parsed.zone || null,
      aisle: parsed.aisle || null,
      rack: parsed.rack || null,
      shelf: parsed.shelf || null,
      bin: parsed.bin || null,
      binType: parsed.binType || null,
      isActive: parsed.isActive ?? true,
    })
    .returning()

  revalidatePath("/inventory/locations")
  return bin
}

export async function updateBin(id: string, data: Partial<BinFormData>) {
  const { tenantId } = await getTenantId()

  const [bin] = await db
    .update(locationBins)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(locationBins.id, id),
        eq(locationBins.tenantId, tenantId)
      )
    )
    .returning()

  if (!bin) {
    throw new Error("Bin not found")
  }

  revalidatePath("/inventory/locations")
  return bin
}

export async function deleteBin(id: string) {
  const { tenantId } = await getTenantId()

  await db
    .delete(locationBins)
    .where(
      and(
        eq(locationBins.id, id),
        eq(locationBins.tenantId, tenantId)
      )
    )

  revalidatePath("/inventory/locations")
}