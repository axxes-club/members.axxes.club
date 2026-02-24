/**
 * Orders.co Integration Provider
 * Centralized order management for restaurants and food service businesses
 */

import { db } from "@/lib/db"
import { orders, orderItems, contacts } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { BaseIntegration } from "../base"
import type {
  ApiKeyConfig,
  IntegrationProviderMeta,
  SyncResult,
  ExternalEvent,
  ExternalOrder,
  SyncError,
} from "../types"

const ORDERS_CO_BASE_URL = "https://api.orders.co"

export class OrdersCoIntegration extends BaseIntegration {
  readonly meta: IntegrationProviderMeta = {
    id: "orders-co",
    name: "Orders.co",
    description: "Centralized order management for restaurants and food service businesses.",
    category: "orders",
    icon: "Package",
    website: "https://orders.co",
    authType: "apikey",
    features: ["orders"],
  }

  getApiKeyConfig(): ApiKeyConfig {
    return {
      keyName: "Orders.co API Key",
      requiresAccountId: true,
      validationUrl: `${ORDERS_CO_BASE_URL}/v1/auth/validate`,
    }
  }

  /**
   * Fetch orders from Orders.co
   */
  async fetchOrders(apiKey: string, accountId: string, params?: {
    since?: Date
    limit?: number
    offset?: number
  }): Promise<ExternalOrder[]> {
    const url = new URL(`${ORDERS_CO_BASE_URL}/v1/orders`)
    
    if (params?.since) {
      url.searchParams.set("created_after", params.since.toISOString())
    }
    if (params?.limit) {
      url.searchParams.set("limit", params.limit.toString())
    }
    if (params?.offset) {
      url.searchParams.set("offset", params.offset.toString())
    }

    const response = await fetch(url.toString(), {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "X-Account-Id": accountId,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.status}`)
    }

    const data = await response.json()
    
    return (data.orders || []).map((order: Record<string, unknown>) => ({
      id: order.id as string,
      orderNumber: order.order_number as string,
      customerEmail: order.customer_email as string,
      customerName: order.customer_name as string | undefined,
      total: parseFloat(order.total as string || "0"),
      currency: (order.currency as string) || "USD",
      status: order.status as string,
      items: (order.line_items as Array<Record<string, unknown>> || []).map((item) => ({
        id: item.id as string,
        name: item.name as string,
        quantity: item.quantity as number,
        unitPrice: parseFloat((item.price as string) || "0"),
      })),
      createdAt: new Date(order.created_at as string),
    }))
  }

  /**
   * Sync orders from Orders.co to local database
   */
  async syncOrders(tenantId: string, fullSync = false): Promise<SyncResult> {
    const startedAt = new Date()
    const errors: SyncError[] = []
    let pulled = 0
    let updated = 0
    let failed = 0

    try {
      const connection = await db.query.integrationConnection.findFirst({
        where: and(
          eq(orders.tenantId, tenantId),
          eq(orders.tenantId, tenantId)
        ),
      })

      const apiKey = connection?.apiKey
      const accountId = connection?.accountId

      if (!apiKey || !accountId) {
        return {
          success: false,
          provider: this.meta.id,
          entityType: "orders",
          pulled: 0,
          pushed: 0,
          updated: 0,
          failed: 1,
          errors: [{ message: "No API credentials configured" }],
          startedAt,
          completedAt: new Date(),
        }
      }

      const metadata = connection?.metadata as { lastOrderSync?: string } | null
      const since = fullSync ? undefined : metadata?.lastOrderSync ? new Date(metadata.lastOrderSync) : undefined

      const externalOrders = await this.fetchOrders(apiKey, accountId, { since })
      pulled = externalOrders.length

      for (const externalOrder of externalOrders) {
        try {
          // Find or create contact
          let contactId: string | null = null
          if (externalOrder.customerEmail) {
            const existingContact = await db.query.contacts.findFirst({
              where: and(
                eq(contacts.tenantId, tenantId),
                eq(contacts.email, externalOrder.customerEmail)
              ),
            })

            if (existingContact) {
              contactId = existingContact.id
            } else {
              const nameParts = externalOrder.customerName?.split(" ") || []
              const [newContact] = await db.insert(contacts).values({
                tenantId,
                email: externalOrder.customerEmail,
                firstName: nameParts[0] || null,
                lastName: nameParts.slice(1).join(" ") || null,
              }).returning()
              contactId = newContact.id
            }
          }

          const existingOrder = await db.query.orders.findFirst({
            where: and(
              eq(orders.tenantId, tenantId),
              eq(orders.externalOrderId, externalOrder.id),
              eq(orders.externalPlatform, "orders-co")
            ),
          })

          if (existingOrder) {
            await db.update(orders)
              .set({
                contactId: contactId || existingOrder.contactId,
                status: this.mapOrderStatus(externalOrder.status),
                updatedAt: new Date(),
              })
              .where(eq(orders.id, existingOrder.id))
            updated++
          } else {
            const [newOrder] = await db.insert(orders).values({
              tenantId,
              contactId,
              customerEmail: externalOrder.customerEmail,
              customerFirstName: externalOrder.customerName?.split(" ")[0] || null,
              customerLastName: externalOrder.customerName?.split(" ").slice(1).join(" ") || null,
              orderNumber: externalOrder.orderNumber,
              status: this.mapOrderStatus(externalOrder.status),
              total: externalOrder.total.toString(),
              currency: externalOrder.currency,
              source: "orders-co",
              externalOrderId: externalOrder.id,
              externalPlatform: "orders-co",
            }).returning()

            for (const item of externalOrder.items) {
              await db.insert(orderItems).values({
                tenantId,
                orderId: newOrder.id,
                type: "product",
                name: item.name,
                unitPrice: item.unitPrice.toString(),
                quantity: item.quantity,
                total: (item.unitPrice * item.quantity).toString(),
              })
            }
            updated++
          }
        } catch (error) {
          failed++
          errors.push({
            externalId: externalOrder.id,
            message: error instanceof Error ? error.message : "Unknown error",
          })
        }
      }

      if (connection) {
        await db.update(orders)
          .set({
            metadata: {
              ...(connection.metadata as Record<string, unknown> || {}),
              lastOrderSync: new Date().toISOString(),
            },
            updatedAt: new Date(),
          })
          .where(eq(orders.id, connection.id))
      }

      return {
        success: failed === 0,
        provider: this.meta.id,
        entityType: "orders",
        pulled,
        pushed: 0,
        updated,
        failed,
        errors,
        startedAt,
        completedAt: new Date(),
      }
    } catch (error) {
      return {
        success: false,
        provider: this.meta.id,
        entityType: "orders",
        pulled: 0,
        pushed: 0,
        updated: 0,
        failed: 1,
        errors: [{ message: error instanceof Error ? error.message : "Unknown error" }],
        startedAt,
        completedAt: new Date(),
      }
    }
  }

  private mapOrderStatus(status: string): "pending" | "confirmed" | "cancelled" | "refunded" {
    switch (status.toLowerCase()) {
      case "new":
      case "pending":
      case "confirmed":
        return "pending"
      case "in_progress":
      case "ready":
      case "completed":
        return "confirmed"
      case "cancelled":
        return "cancelled"
      case "refunded":
        return "refunded"
      default:
        return "pending"
    }
  }

  // Stub implementations for required abstract methods
  async syncEvents(): Promise<SyncResult> {
    return {
      success: true,
      provider: this.meta.id,
      entityType: "events",
      pulled: 0,
      pushed: 0,
      updated: 0,
      failed: 0,
      errors: [],
      startedAt: new Date(),
      completedAt: new Date(),
    }
  }

  async handleWebhook(): Promise<{ success: boolean; action?: string }> {
    return { success: true, action: "ignored" }
  }

  async fetchExternalEvents(): Promise<ExternalEvent[]> {
    return []
  }

  async fetchExternalOrders(): Promise<ExternalOrder[]> {
    // API key based integration - requires credentials per-call
    return []
  }
}
