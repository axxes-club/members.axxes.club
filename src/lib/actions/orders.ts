"use server"

import { db } from "@/lib/db"
import { orders, orderItems } from "@/lib/db/schema"
import { eq, and, desc, sql, ilike, or } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getAuthContext } from "@/lib/auth"

async function getTenantId() {
  return getAuthContext()
}

export async function getOrders({
  search,
  status,
  page = 1,
  limit = 20,
}: {
  search?: string
  status?: string
  page?: number
  limit?: number
} = {}) {
  const { tenantId } = await getTenantId()

  const conditions = [
    eq(orders.tenantId, tenantId),
    sql`${orders.deletedAt} IS NULL`,
  ]

  if (status && status !== "all") {
    conditions.push(eq(orders.status, status as typeof orders.status.enumValues[number]))
  }

  if (search) {
    conditions.push(
      or(
        ilike(orders.orderNumber, `%${search}%`),
        ilike(orders.customerEmail, `%${search}%`),
        ilike(orders.customerFirstName, `%${search}%`),
        ilike(orders.customerLastName, `%${search}%`)
      )!
    )
  }

  const [orderList, countResult] = await Promise.all([
    db.query.orders.findMany({
      where: and(...conditions),
      with: {
        items: true,
        contact: true,
      },
      orderBy: [desc(orders.createdAt)],
      limit,
      offset: (page - 1) * limit,
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(and(...conditions)),
  ])

  return {
    orders: orderList,
    total: Number(countResult[0].count),
    page,
    limit,
    totalPages: Math.ceil(Number(countResult[0].count) / limit),
  }
}

export async function getOrder(id: string) {
  const { tenantId } = await getTenantId()

  const order = await db.query.orders.findFirst({
    where: and(
      eq(orders.id, id),
      eq(orders.tenantId, tenantId),
      sql`${orders.deletedAt} IS NULL`
    ),
    with: {
      items: true,
      contact: true,
    },
  })

  if (!order) {
    throw new Error("Order not found")
  }

  return order
}

export async function updateOrderStatus(id: string, status: string) {
  const { tenantId } = await getTenantId()

  const updateData: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  }

  if (status === "cancelled") {
    updateData.cancelledAt = new Date()
  } else if (status === "refunded") {
    updateData.refundedAt = new Date()
  }

  const [order] = await db
    .update(orders)
    .set(updateData)
    .where(
      and(
        eq(orders.id, id),
        eq(orders.tenantId, tenantId)
      )
    )
    .returning()

  revalidatePath("/orders")
  revalidatePath(`/orders/${id}`)
  return order
}

export async function updateFulfillmentStatus(id: string, fulfillmentStatus: string) {
  const { tenantId } = await getTenantId()

  const updateData: Record<string, unknown> = {
    fulfillmentStatus,
    updatedAt: new Date(),
  }

  if (fulfillmentStatus === "fulfilled") {
    updateData.fulfilledAt = new Date()
  }

  const [order] = await db
    .update(orders)
    .set(updateData)
    .where(
      and(
        eq(orders.id, id),
        eq(orders.tenantId, tenantId)
      )
    )
    .returning()

  revalidatePath("/orders")
  revalidatePath(`/orders/${id}`)
  return order
}

export async function getOrderStats() {
  const { tenantId } = await getTenantId()

  const [total, pending, fulfilled, revenue] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          sql`${orders.deletedAt} IS NULL`
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          eq(orders.status, "pending"),
          sql`${orders.deletedAt} IS NULL`
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          eq(orders.fulfillmentStatus, "fulfilled"),
          sql`${orders.deletedAt} IS NULL`
        )
      ),
    db
      .select({ total: sql<number>`COALESCE(SUM(${orders.total}::numeric), 0)` })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          eq(orders.paymentStatus, "captured"),
          sql`${orders.deletedAt} IS NULL`
        )
      ),
  ])

  return {
    total: Number(total[0].count),
    pending: Number(pending[0].count),
    fulfilled: Number(fulfilled[0].count),
    revenue: Number(revenue[0].total),
  }
}
