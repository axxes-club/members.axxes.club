"use server"

import { db } from "@/lib/db"
import { suppliers, supplierParts } from "@/lib/db/schema"
import { eq, and, desc, asc, sql, ilike, or } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getAuthContext } from "@/lib/auth"

// ============= SUPPLIERS =============

const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  description: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  taxId: z.string().optional(),
  currency: z.string().default("USD"),
  paymentTerms: z.string().optional(),
  leadTimeDays: z.number().optional(),
  rating: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
})

export type SupplierFormData = z.infer<typeof supplierSchema>

async function getTenantId() {
  return getAuthContext()
}

export async function getSuppliers({
  search,
  sortBy = "name",
  sortOrder = "asc",
  page = 1,
  limit = 20,
  activeOnly = false,
}: {
  search?: string
  sortBy?: "name" | "rating" | "createdAt"
  sortOrder?: "asc" | "desc"
  page?: number
  limit?: number
  activeOnly?: boolean
} = {}) {
  const { tenantId } = await getTenantId()

  const conditions = [
    eq(suppliers.tenantId, tenantId),
    sql`${suppliers.deletedAt} IS NULL`,
  ]

  if (activeOnly) {
    conditions.push(eq(suppliers.isActive, true))
  }

  if (search) {
    conditions.push(
      or(
        ilike(suppliers.name, `%${search}%`),
        ilike(suppliers.email, `%${search}%`),
        ilike(suppliers.phone, `%${search}%`)
      )!
    )
  }

  const orderColumn = {
    name: suppliers.name,
    rating: suppliers.rating,
    createdAt: suppliers.createdAt,
  }[sortBy]

  const orderFn = sortOrder === "asc" ? asc : desc

  const [supplierList, countResult] = await Promise.all([
    db.query.suppliers.findMany({
      where: and(...conditions),
      orderBy: [orderFn(orderColumn)],
      limit,
      offset: (page - 1) * limit,
      with: {
        supplierParts: {
          limit: 5,
        },
      },
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(suppliers)
      .where(and(...conditions)),
  ])

  return {
    suppliers: supplierList,
    total: Number(countResult[0].count),
    page,
    limit,
    totalPages: Math.ceil(Number(countResult[0].count) / limit),
  }
}

export async function getSupplier(id: string) {
  const { tenantId } = await getTenantId()

  const supplier = await db.query.suppliers.findFirst({
    where: and(
      eq(suppliers.id, id),
      eq(suppliers.tenantId, tenantId),
      sql`${suppliers.deletedAt} IS NULL`
    ),
    with: {
      supplierParts: {
        with: {
          product: true,
        },
      },
    },
  })

  if (!supplier) {
    throw new Error("Supplier not found")
  }

  return supplier
}

export async function createSupplier(data: SupplierFormData) {
  const { tenantId } = await getTenantId()

  const parsed = supplierSchema.parse(data)

  const slug = parsed.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

  const [supplier] = await db
    .insert(suppliers)
    .values({
      tenantId,
      name: parsed.name,
      slug,
      description: parsed.description || null,
      email: parsed.email || null,
      phone: parsed.phone || null,
      website: parsed.website || null,
      addressLine1: parsed.addressLine1 || null,
      addressLine2: parsed.addressLine2 || null,
      city: parsed.city || null,
      state: parsed.state || null,
      postalCode: parsed.postalCode || null,
      country: parsed.country || "US",
      taxId: parsed.taxId || null,
      currency: parsed.currency || "USD",
      paymentTerms: parsed.paymentTerms || null,
      leadTimeDays: parsed.leadTimeDays,
      rating: parsed.rating || 5,
      notes: parsed.notes || null,
    })
    .returning()

  revalidatePath("/inventory/suppliers")
  return supplier
}

export async function updateSupplier(id: string, data: Partial<SupplierFormData>) {
  const { tenantId } = await getTenantId()

  const [supplier] = await db
    .update(suppliers)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(suppliers.id, id),
        eq(suppliers.tenantId, tenantId)
      )
    )
    .returning()

  if (!supplier) {
    throw new Error("Supplier not found")
  }

  revalidatePath("/inventory/suppliers")
  revalidatePath(`/inventory/suppliers/${id}`)
  return supplier
}

export async function deleteSupplier(id: string) {
  const { tenantId } = await getTenantId()

  await db
    .update(suppliers)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(suppliers.id, id),
        eq(suppliers.tenantId, tenantId)
      )
    )

  revalidatePath("/inventory/suppliers")
}

export async function getSupplierStats() {
  const { tenantId } = await getTenantId()

  const [total, active, withParts] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.tenantId, tenantId),
          sql`${suppliers.deletedAt} IS NULL`
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.tenantId, tenantId),
          eq(suppliers.isActive, true),
          sql`${suppliers.deletedAt} IS NULL`
        )
      ),
    db
      .select({ count: sql<number>`count(DISTINCT ${supplierParts.supplierId})` })
      .from(supplierParts)
      .innerJoin(suppliers, eq(supplierParts.supplierId, suppliers.id))
      .where(
        and(
          eq(suppliers.tenantId, tenantId),
          sql`${suppliers.deletedAt} IS NULL`
        )
      ),
  ])

  return {
    total: Number(total[0].count),
    active: Number(active[0].count),
    withParts: Number(withParts[0].count),
  }
}

// ============= SUPPLIER PARTS =============

const supplierPartSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  productId: z.string().min(1, "Product is required"),
  sku: z.string().min(1, "SKU is required"),
  manufacturerPartNumber: z.string().optional(),
  description: z.string().optional(),
  unitPrice: z.string().min(1, "Unit price is required"),
  currency: z.string().default("USD"),
  minimumOrderQuantity: z.number().optional(),
  packagingQuantity: z.number().optional(),
  leadTimeDays: z.number().optional(),
  isActive: z.boolean().optional(),
  isPrimary: z.boolean().optional(),
})

export type SupplierPartFormData = z.infer<typeof supplierPartSchema>

export async function getSupplierParts({
  supplierId,
  productId,
  search,
  page = 1,
  limit = 20,
}: {
  supplierId?: string
  productId?: string
  search?: string
  page?: number
  limit?: number
} = {}) {
  const { tenantId } = await getTenantId()

  const conditions = [
    eq(supplierParts.tenantId, tenantId),
    sql`${supplierParts.deletedAt} IS NULL`,
  ]

  if (supplierId) {
    conditions.push(eq(supplierParts.supplierId, supplierId))
  }

  if (productId) {
    conditions.push(eq(supplierParts.productId, productId))
  }

  if (search) {
    conditions.push(
      or(
        ilike(supplierParts.sku, `%${search}%`),
        ilike(supplierParts.manufacturerPartNumber, `%${search}%`),
        ilike(supplierParts.description, `%${search}%`)
      )!
    )
  }

  const [parts, countResult] = await Promise.all([
    db.query.supplierParts.findMany({
      where: and(...conditions),
      limit,
      offset: (page - 1) * limit,
      with: {
        supplier: true,
        product: true,
      },
      orderBy: [asc(supplierParts.sku)],
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(supplierParts)
      .where(and(...conditions)),
  ])

  return {
    parts,
    total: Number(countResult[0].count),
    page,
    limit,
    totalPages: Math.ceil(Number(countResult[0].count) / limit),
  }
}

export async function createSupplierPart(data: SupplierPartFormData) {
  const { tenantId } = await getTenantId()

  const parsed = supplierPartSchema.parse(data)

  const [part] = await db
    .insert(supplierParts)
    .values({
      tenantId,
      supplierId: parsed.supplierId,
      productId: parsed.productId,
      sku: parsed.sku,
      manufacturerPartNumber: parsed.manufacturerPartNumber || null,
      description: parsed.description || null,
      unitPrice: parsed.unitPrice,
      currency: parsed.currency || "USD",
      minimumOrderQuantity: parsed.minimumOrderQuantity || 1,
      packagingQuantity: parsed.packagingQuantity || 1,
      leadTimeDays: parsed.leadTimeDays,
      isActive: parsed.isActive ?? true,
      isPrimary: parsed.isPrimary ?? false,
    })
    .returning()

  revalidatePath("/inventory/suppliers")
  return part
}

export async function updateSupplierPart(id: string, data: Partial<SupplierPartFormData>) {
  const { tenantId } = await getTenantId()

  const [part] = await db
    .update(supplierParts)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(supplierParts.id, id),
        eq(supplierParts.tenantId, tenantId)
      )
    )
    .returning()

  if (!part) {
    throw new Error("Supplier part not found")
  }

  revalidatePath("/inventory/suppliers")
  return part
}

export async function deleteSupplierPart(id: string) {
  const { tenantId } = await getTenantId()

  await db
    .update(supplierParts)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(supplierParts.id, id),
        eq(supplierParts.tenantId, tenantId)
      )
    )

  revalidatePath("/inventory/suppliers")
}