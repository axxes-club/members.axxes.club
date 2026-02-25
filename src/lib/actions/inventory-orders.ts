"use server"

import { db } from "@/lib/db"
import { salesOrders, salesOrderItems, products, productVariants, inventoryLocations } from "@/lib/db/schema"
import { eq, and, desc, asc, sql, ilike, or, isNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { nanoid } from "nanoid"
import { getAuthContext } from "@/lib/auth"

// ============= SALES ORDERS =============

const salesOrderSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerPhone: z.string().optional(),
  orderDate: z.string().optional(),
  targetDate: z.string().optional(),
  currency: z.string().default("USD"),
  shippingAddressLine1: z.string().optional(),
  shippingAddressLine2: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  shippingPostalCode: z.string().optional(),
  shippingCountry: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
})

export type SalesOrderFormData = z.infer<typeof salesOrderSchema>

const salesOrderItemSchema = z.object({
  productId: z.string().optional(),
  productVariantId: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  sku: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.string().min(1, "Unit price is required"),
})

export type SalesOrderItemFormData = z.infer<typeof salesOrderItemSchema>

async function getTenantId() {
  return getAuthContext()
}

async function generateOrderNumber() {
  const prefix = "SO"
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = nanoid(4).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

export async function getSalesOrders({
  search,
  filter = "all",
  sortBy = "createdAt",
  sortOrder = "desc",
  page = 1,
  limit = 20,
}: {
  search?: string
  filter?: "all" | "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled"
  sortBy?: "orderNumber" | "orderDate" | "totalAmount" | "createdAt"
  sortOrder?: "asc" | "desc"
  page?: number
  limit?: number
} = {}) {
  const { tenantId } = await getTenantId()

  const conditions = [
    eq(salesOrders.tenantId, tenantId),
    isNull(salesOrders.deletedAt),
  ]

  if (filter !== "all") {
    conditions.push(eq(salesOrders.status, filter))
  }

  if (search) {
    conditions.push(
      or(
        ilike(salesOrders.orderNumber, `%${search}%`),
        ilike(salesOrders.customerName, `%${search}%`),
        ilike(salesOrders.customerEmail, `%${search}%`)
      )!
    )
  }

  const orderColumn = {
    orderNumber: salesOrders.orderNumber,
    orderDate: salesOrders.orderDate,
    totalAmount: salesOrders.totalAmount,
    createdAt: salesOrders.createdAt,
  }[sortBy]

  const orderFn = sortOrder === "asc" ? asc : desc

  const [orders, countResult] = await Promise.all([
    db.query.salesOrders.findMany({
      where: and(...conditions),
      with: {
        items: {
          limit: 5,
        },
      },
      orderBy: [orderFn(orderColumn)],
      limit,
      offset: (page - 1) * limit,
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(salesOrders)
      .where(and(...conditions)),
  ])

  return {
    orders,
    total: Number(countResult[0].count),
    page,
    limit,
    totalPages: Math.ceil(Number(countResult[0].count) / limit),
  }
}

export async function getSalesOrder(id: string) {
  const { tenantId } = await getTenantId()

  const order = await db.query.salesOrders.findFirst({
    where: and(
      eq(salesOrders.id, id),
      eq(salesOrders.tenantId, tenantId),
      isNull(salesOrders.deletedAt)
    ),
    with: {
      items: {
        with: {
          product: true,
          productVariant: true,
        },
      },
    },
  })

  if (!order) {
    throw new Error("Sales order not found")
  }

  return order
}

export async function createSalesOrder(
  data: SalesOrderFormData,
  items: SalesOrderItemFormData[] = []
) {
  const { tenantId } = await getTenantId()

  const parsed = salesOrderSchema.parse(data)
  const orderNumber = await generateOrderNumber()

  // Calculate totals from items
  let subtotal = 0
  for (const item of items) {
    subtotal += parseFloat(item.unitPrice) * item.quantity
  }

  const [order] = await db
    .insert(salesOrders)
    .values({
      tenantId,
      orderNumber,
      customerName: parsed.customerName,
      customerEmail: parsed.customerEmail || null,
      customerPhone: parsed.customerPhone || null,
      orderDate: parsed.orderDate ? new Date(parsed.orderDate) : new Date(),
      targetDate: parsed.targetDate ? new Date(parsed.targetDate) : null,
      currency: parsed.currency || "USD",
      subtotal: subtotal.toString(),
      totalAmount: subtotal.toString(),
      shippingAddressLine1: parsed.shippingAddressLine1 || null,
      shippingAddressLine2: parsed.shippingAddressLine2 || null,
      shippingCity: parsed.shippingCity || null,
      shippingState: parsed.shippingState || null,
      shippingPostalCode: parsed.shippingPostalCode || null,
      shippingCountry: parsed.shippingCountry || "US",
      notes: parsed.notes || null,
      internalNotes: parsed.internalNotes || null,
    })
    .returning()

  // Insert items
  if (items.length > 0) {
    await db.insert(salesOrderItems).values(
      items.map((item) => ({
        tenantId,
        salesOrderId: order.id,
        productId: item.productId || null,
        productVariantId: item.productVariantId || null,
        description: item.description,
        sku: item.sku || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: (parseFloat(item.unitPrice) * item.quantity).toString(),
      }))
    )
  }

  revalidatePath("/inventory/sales-orders")
  return order
}

export async function updateSalesOrder(id: string, data: Partial<SalesOrderFormData>) {
  const { tenantId } = await getTenantId()

  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: new Date(),
  }

  // Convert date strings to Date objects
  if (data.orderDate) {
    updateData.orderDate = new Date(data.orderDate)
  }
  if (data.targetDate !== undefined) {
    updateData.targetDate = data.targetDate ? new Date(data.targetDate) : null
  }

  const [order] = await db
    .update(salesOrders)
    .set(updateData)
    .where(
      and(
        eq(salesOrders.id, id),
        eq(salesOrders.tenantId, tenantId)
      )
    )
    .returning()

  if (!order) {
    throw new Error("Sales order not found")
  }

  revalidatePath("/inventory/sales-orders")
  revalidatePath(`/inventory/sales-orders/${id}`)
  return order
}

export async function deleteSalesOrder(id: string) {
  const { tenantId } = await getTenantId()

  await db
    .update(salesOrders)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(salesOrders.id, id),
        eq(salesOrders.tenantId, tenantId)
      )
    )

  revalidatePath("/inventory/sales-orders")
}

export async function getSalesOrderStats() {
  const { tenantId } = await getTenantId()

  const [total, pending, shipped, totalValue] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(salesOrders)
      .where(
        and(
          eq(salesOrders.tenantId, tenantId),
          isNull(salesOrders.deletedAt)
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(salesOrders)
      .where(
        and(
          eq(salesOrders.tenantId, tenantId),
          eq(salesOrders.status, "pending"),
          isNull(salesOrders.deletedAt)
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(salesOrders)
      .where(
        and(
          eq(salesOrders.tenantId, tenantId),
          eq(salesOrders.status, "shipped"),
          isNull(salesOrders.deletedAt)
        )
      ),
    db
      .select({ value: sql<number>`COALESCE(SUM(${salesOrders.totalAmount}::numeric), 0)` })
      .from(salesOrders)
      .where(
        and(
          eq(salesOrders.tenantId, tenantId),
          isNull(salesOrders.deletedAt)
        )
      ),
  ])

  return {
    total: Number(total[0].count),
    pending: Number(pending[0].count),
    shipped: Number(shipped[0].count),
    totalValue: Number(totalValue[0].value),
  }
}

// ============= HELPERS =============

export async function getProductsForSalesOrders() {
  const { tenantId } = await getTenantId()

  return db.query.products.findMany({
    where: and(
      eq(products.tenantId, tenantId),
      isNull(products.deletedAt)
    ),
    columns: {
      id: true,
      name: true,
      sku: true,
      price: true,
    },
    orderBy: [asc(products.name)],
  })
}