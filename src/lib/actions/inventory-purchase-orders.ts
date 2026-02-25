"use server"

import { db } from "@/lib/db"
import { purchaseOrders, purchaseOrderItems, suppliers, products, supplierParts } from "@/lib/db/schema"
import { eq, and, desc, asc, sql, ilike, or } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { nanoid } from "nanoid"
import { getAuthContext } from "@/lib/auth"

// ============= PURCHASE ORDERS =============

const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  orderDate: z.string().optional(),
  targetDate: z.string().optional(),
  currency: z.string().default("USD"),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
})

export type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>

const purchaseOrderItemSchema = z.object({
  productId: z.string().optional(),
  supplierPartId: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  sku: z.string().optional(),
  manufacturerPartNumber: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.string().optional(),
  targetDate: z.string().optional(),
  notes: z.string().optional(),
})

export type PurchaseOrderItemFormData = z.infer<typeof purchaseOrderItemSchema>

async function getTenantId() {
  return getAuthContext()
}

async function generateOrderNumber() {
  const prefix = "PO"
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = nanoid(4).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

export async function getPurchaseOrders({
  search,
  filter = "all",
  sortBy = "createdAt",
  sortOrder = "desc",
  page = 1,
  limit = 20,
}: {
  search?: string
  filter?: "all" | "pending" | "sent" | "confirmed" | "partially_received" | "received" | "cancelled"
  sortBy?: "orderNumber" | "orderDate" | "totalAmount" | "createdAt"
  sortOrder?: "asc" | "desc"
  page?: number
  limit?: number
} = {}) {
  const { tenantId } = await getTenantId()

  const conditions = [
    eq(purchaseOrders.tenantId, tenantId),
    sql`${purchaseOrders.deletedAt} IS NULL`,
  ]

  if (filter !== "all") {
    conditions.push(eq(purchaseOrders.status, filter))
  }

  if (search) {
    conditions.push(
      or(
        ilike(purchaseOrders.orderNumber, `%${search}%`),
        ilike(purchaseOrders.supplierReference, `%${search}%`)
      )!
    )
  }

  const orderColumn = {
    orderNumber: purchaseOrders.orderNumber,
    orderDate: purchaseOrders.orderDate,
    totalAmount: purchaseOrders.totalAmount,
    createdAt: purchaseOrders.createdAt,
  }[sortBy]

  const orderFn = sortOrder === "asc" ? asc : desc

  const [orders, countResult] = await Promise.all([
    db.query.purchaseOrders.findMany({
      where: and(...conditions),
      with: {
        supplier: true,
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
      .from(purchaseOrders)
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

export async function getPurchaseOrder(id: string) {
  const { tenantId } = await getTenantId()

  const order = await db.query.purchaseOrders.findFirst({
    where: and(
      eq(purchaseOrders.id, id),
      eq(purchaseOrders.tenantId, tenantId),
      sql`${purchaseOrders.deletedAt} IS NULL`
    ),
    with: {
      supplier: true,
      items: {
        with: {
          product: true,
          supplierPart: true,
        },
      },
    },
  })

  if (!order) {
    throw new Error("Purchase order not found")
  }

  return order
}

export async function createPurchaseOrder(
  data: PurchaseOrderFormData,
  items: PurchaseOrderItemFormData[] = []
) {
  const { tenantId, userId } = await getTenantId()

  const parsed = purchaseOrderSchema.parse(data)
  const orderNumber = await generateOrderNumber()

  // Calculate totals from items
  let subtotal = 0
  for (const item of items) {
    if (item.unitPrice) {
      subtotal += parseFloat(item.unitPrice) * item.quantity
    }
  }

  const [order] = await db
    .insert(purchaseOrders)
    .values({
      tenantId,
      supplierId: parsed.supplierId,
      orderNumber,
      orderDate: parsed.orderDate ? new Date(parsed.orderDate) : new Date(),
      targetDate: parsed.targetDate ? new Date(parsed.targetDate) : null,
      currency: parsed.currency || "USD",
      subtotal: subtotal.toString(),
      totalAmount: subtotal.toString(),
      notes: parsed.notes || null,
      internalNotes: parsed.internalNotes || null,
      orderedBy: userId,
    })
    .returning()

  // Insert items
  if (items.length > 0) {
    await db.insert(purchaseOrderItems).values(
      items.map((item) => ({
        tenantId,
        purchaseOrderId: order.id,
        productId: item.productId || null,
        supplierPartId: item.supplierPartId || null,
        description: item.description,
        sku: item.sku || null,
        manufacturerPartNumber: item.manufacturerPartNumber || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice || null,
        totalPrice: item.unitPrice ? (parseFloat(item.unitPrice) * item.quantity).toString() : null,
        targetDate: item.targetDate ? new Date(item.targetDate) : null,
        notes: item.notes || null,
      }))
    )
  }

  revalidatePath("/inventory/purchase-orders")
  return order
}

export async function updatePurchaseOrder(id: string, data: Partial<PurchaseOrderFormData>) {
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
    .update(purchaseOrders)
    .set(updateData)
    .where(
      and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.tenantId, tenantId)
      )
    )
    .returning()

  if (!order) {
    throw new Error("Purchase order not found")
  }

  revalidatePath("/inventory/purchase-orders")
  revalidatePath(`/inventory/purchase-orders/${id}`)
  return order
}

export async function deletePurchaseOrder(id: string) {
  const { tenantId } = await getTenantId()

  await db
    .update(purchaseOrders)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.tenantId, tenantId)
      )
    )

  revalidatePath("/inventory/purchase-orders")
}

export async function getPurchaseOrderStats() {
  const { tenantId } = await getTenantId()

  const [total, pending, received, totalValue] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.tenantId, tenantId),
          sql`${purchaseOrders.deletedAt} IS NULL`
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.tenantId, tenantId),
          eq(purchaseOrders.status, "pending"),
          sql`${purchaseOrders.deletedAt} IS NULL`
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.tenantId, tenantId),
          eq(purchaseOrders.status, "received"),
          sql`${purchaseOrders.deletedAt} IS NULL`
        )
      ),
    db
      .select({ value: sql<number>`COALESCE(SUM(${purchaseOrders.totalAmount}::numeric), 0)` })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.tenantId, tenantId),
          sql`${purchaseOrders.deletedAt} IS NULL`
        )
      ),
  ])

  return {
    total: Number(total[0].count),
    pending: Number(pending[0].count),
    received: Number(received[0].count),
    totalValue: Number(totalValue[0].value),
  }
}

// ============= HELPERS =============

export async function getSuppliersForSelect() {
  const { tenantId } = await getTenantId()

  return db.query.suppliers.findMany({
    where: and(
      eq(suppliers.tenantId, tenantId),
      eq(suppliers.isActive, true),
      sql`${suppliers.deletedAt} IS NULL`
    ),
    columns: {
      id: true,
      name: true,
    },
    orderBy: [asc(suppliers.name)],
  })
}

export async function getProductsForSelect() {
  const { tenantId } = await getTenantId()

  return db.query.products.findMany({
    where: and(
      eq(products.tenantId, tenantId),
      sql`${products.deletedAt} IS NULL`
    ),
    columns: {
      id: true,
      name: true,
      sku: true,
    },
    orderBy: [asc(products.name)],
  })
}