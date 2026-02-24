"use server"

import { db } from "@/lib/db"
import { products, productCategories } from "@/lib/db/schema"
import { eq, and, desc, asc, sql, ilike, or } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { nanoid } from "nanoid"
import { getAuthContext } from "@/lib/auth"

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  price: z.string(),
  compareAtPrice: z.string().optional(),
  costPrice: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  quantity: z.number().optional(),
  categoryId: z.string().optional(),
  status: z.enum(["draft", "active", "archived", "out_of_stock"]).optional(),
  trackInventory: z.boolean().optional(),
  lowStockThreshold: z.number().optional(),
})

export type ProductFormData = z.infer<typeof productSchema>

async function getTenantId() {
  return getAuthContext()
}

export async function getProducts({
  search,
  filter = "all",
  sortBy = "createdAt",
  sortOrder = "desc",
  page = 1,
  limit = 20,
}: {
  search?: string
  filter?: "all" | "active" | "draft" | "archived" | "low_stock"
  sortBy?: "name" | "price" | "quantity" | "createdAt"
  sortOrder?: "asc" | "desc"
  page?: number
  limit?: number
} = {}) {
  const { tenantId } = await getTenantId()

  const conditions = [
    eq(products.tenantId, tenantId),
    sql`${products.deletedAt} IS NULL`,
  ]

  if (filter === "active") {
    conditions.push(eq(products.status, "active"))
  } else if (filter === "draft") {
    conditions.push(eq(products.status, "draft"))
  } else if (filter === "archived") {
    conditions.push(eq(products.status, "archived"))
  } else if (filter === "low_stock") {
    conditions.push(sql`${products.quantity} <= ${products.lowStockThreshold}`)
    conditions.push(eq(products.trackInventory, true))
  }

  if (search) {
    conditions.push(
      or(
        ilike(products.name, `%${search}%`),
        ilike(products.sku, `%${search}%`),
        ilike(products.description, `%${search}%`)
      )!
    )
  }

  const orderColumn = {
    name: products.name,
    price: products.price,
    quantity: products.quantity,
    createdAt: products.createdAt,
  }[sortBy]

  const orderFn = sortOrder === "asc" ? asc : desc

  const [productList, countResult] = await Promise.all([
    db.query.products.findMany({
      where: and(...conditions),
      with: {
        category: true,
        variants: true,
      },
      orderBy: [orderFn(orderColumn)],
      limit,
      offset: (page - 1) * limit,
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(...conditions)),
  ])

  return {
    products: productList,
    total: Number(countResult[0].count),
    page,
    limit,
    totalPages: Math.ceil(Number(countResult[0].count) / limit),
  }
}

export async function getProduct(id: string) {
  const { tenantId } = await getTenantId()

  const product = await db.query.products.findFirst({
    where: and(
      eq(products.id, id),
      eq(products.tenantId, tenantId),
      sql`${products.deletedAt} IS NULL`
    ),
    with: {
      category: true,
      variants: true,
    },
  })

  if (!product) {
    throw new Error("Product not found")
  }

  return product
}

export async function createProduct(data: ProductFormData) {
  const { tenantId } = await getTenantId()

  const parsed = productSchema.parse(data)

  const slug = parsed.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 50)
    + "-" + nanoid(6)

  const [product] = await db
    .insert(products)
    .values({
      tenantId,
      name: parsed.name,
      slug,
      description: parsed.description || null,
      shortDescription: parsed.shortDescription || null,
      price: parsed.price,
      compareAtPrice: parsed.compareAtPrice || null,
      costPrice: parsed.costPrice || null,
      sku: parsed.sku || null,
      barcode: parsed.barcode || null,
      quantity: parsed.quantity ?? 0,
      categoryId: parsed.categoryId || null,
      status: parsed.status || "draft",
      trackInventory: parsed.trackInventory ?? true,
      lowStockThreshold: parsed.lowStockThreshold ?? 5,
    })
    .returning()

  revalidatePath("/inventory")
  return product
}

export async function updateProduct(id: string, data: Partial<ProductFormData>) {
  const { tenantId } = await getTenantId()

  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: new Date(),
  }

  if (data.price !== undefined) {
    updateData.price = parseFloat(data.price as unknown as string).toString()
  }
  if (data.compareAtPrice !== undefined) {
    updateData.compareAtPrice = data.compareAtPrice ? parseFloat(data.compareAtPrice as unknown as string).toString() : null
  }
  if (data.costPrice !== undefined) {
    updateData.costPrice = data.costPrice ? parseFloat(data.costPrice as unknown as string).toString() : null
  }

  const [product] = await db
    .update(products)
    .set(updateData)
    .where(
      and(
        eq(products.id, id),
        eq(products.tenantId, tenantId)
      )
    )
    .returning()

  if (!product) {
    throw new Error("Product not found")
  }

  revalidatePath("/inventory")
  revalidatePath(`/inventory/${id}`)
  return product
}

export async function deleteProduct(id: string) {
  const { tenantId } = await getTenantId()

  await db
    .update(products)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(products.id, id),
        eq(products.tenantId, tenantId)
      )
    )

  revalidatePath("/inventory")
}

export async function getProductStats() {
  const { tenantId } = await getTenantId()

  const [total, active, lowStock, totalValue] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          sql`${products.deletedAt} IS NULL`
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          eq(products.status, "active"),
          sql`${products.deletedAt} IS NULL`
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          sql`${products.deletedAt} IS NULL`,
          eq(products.trackInventory, true),
          sql`${products.quantity} <= ${products.lowStockThreshold}`
        )
      ),
    db
      .select({ value: sql<number>`COALESCE(SUM(${products.price}::numeric * ${products.quantity}), 0)` })
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          sql`${products.deletedAt} IS NULL`
        )
      ),
  ])

  return {
    total: Number(total[0].count),
    active: Number(active[0].count),
    lowStock: Number(lowStock[0].count),
    totalValue: Number(totalValue[0].value),
  }
}

export async function getCategories() {
  const { tenantId } = await getTenantId()

  return db.query.productCategories.findMany({
    where: and(
      eq(productCategories.tenantId, tenantId),
      sql`${productCategories.deletedAt} IS NULL`
    ),
    orderBy: [asc(productCategories.sortOrder), asc(productCategories.name)],
  })
}

export async function createCategory(data: { name: string; description?: string }) {
  const { tenantId } = await getTenantId()

  const [category] = await db
    .insert(productCategories)
    .values({
      tenantId,
      name: data.name,
      description: data.description || null,
      slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    })
    .returning()

  return category
}
