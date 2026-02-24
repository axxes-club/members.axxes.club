/**
 * ShipStation Integration Provider
 * Shipping software to import, manage, and ship orders from any sales channel
 */

import { db } from "@/lib/db"
import { orders, orderItems } from "@/lib/db/schema"
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

const SHIPSTATION_BASE_URL = "https://ssapi.shipstation.com"

export class ShipStationIntegration extends BaseIntegration {
  readonly meta: IntegrationProviderMeta = {
    id: "shipstation",
    name: "ShipStation",
    description: "Shipping software to import, manage, and ship orders from any sales channel.",
    category: "shipping",
    icon: "Truck",
    website: "https://shipstation.com",
    authType: "apikey",
    features: ["orders", "shipping"],
  }

  getApiKeyConfig(): ApiKeyConfig {
    return {
      keyName: "ShipStation API Key",
      requiresAccountId: false,
      validationUrl: `${SHIPSTATION_BASE_URL}/account`,
    }
  }

  /**
   * Fetch orders from ShipStation
   */
  async fetchOrders(apiKey: string, apiSecret: string, params?: {
    since?: Date
    limit?: number
    offset?: number
  }): Promise<ExternalOrder[]> {
    const url = new URL(`${SHIPSTATION_BASE_URL}/orders`)
    
    if (params?.since) {
      url.searchParams.set("createDateStart", params.since.toISOString())
    }
    if (params?.limit) {
      url.searchParams.set("pageSize", params.limit.toString())
    }
    if (params?.offset) {
      url.searchParams.set("page", params.offset.toString())
    }

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")
    const response = await fetch(url.toString(), {
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.status}`)
    }

    const data = await response.json()
    
    return (data.orders || []).map((order: Record<string, unknown>) => ({
      id: order.orderId as string,
      orderNumber: order.orderNumber as string,
      customerEmail: (order.customerEmail as string) || "",
      customerName: `${order.customerName || ""}`.trim(),
      total: parseFloat((order.orderTotal as string) || "0"),
      currency: "USD",
      status: order.orderStatus as string,
      items: (order.items as Array<Record<string, unknown>> || []).map((item) => ({
        id: item.orderItemId as string,
        name: item.name as string,
        quantity: item.quantity as number,
        unitPrice: parseFloat((item.unitPrice as string) || "0"),
      })),
      createdAt: new Date(order.createDate as string),
    }))
  }

  /**
   * Sync orders from ShipStation to local database
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
      const apiSecret = connection?.accessToken // Store secret in accessToken for API key auth

      if (!apiKey || !apiSecret) {
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

      const externalOrders = await this.fetchOrders(apiKey, apiSecret, { since })
      pulled = externalOrders.length

      for (const externalOrder of externalOrders) {
        try {
          const existingOrder = await db.query.orders.findFirst({
            where: and(
              eq(orders.tenantId, tenantId),
              eq(orders.externalOrderId, externalOrder.id),
              eq(orders.externalPlatform, "shipstation")
            ),
          })

          if (existingOrder) {
            await db.update(orders)
              .set({
                status: this.mapOrderStatus(externalOrder.status),
                updatedAt: new Date(),
              })
              .where(eq(orders.id, existingOrder.id))
            updated++
          } else {
            const [newOrder] = await db.insert(orders).values({
              tenantId,
              orderNumber: externalOrder.orderNumber,
              customerEmail: externalOrder.customerEmail,
              customerFirstName: externalOrder.customerName?.split(" ")[0] || null,
              customerLastName: externalOrder.customerName?.split(" ").slice(1).join(" ") || null,
              status: this.mapOrderStatus(externalOrder.status),
              total: externalOrder.total.toString(),
              currency: externalOrder.currency,
              source: "shipstation",
              externalOrderId: externalOrder.id,
              externalPlatform: "shipstation",
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
      case "awaiting_payment":
      case "awaiting_fulfillment":
        return "pending"
      case "awaiting_shipment":
      case "shipped":
      case "delivered":
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

  async fetchExternalOrders(accessToken: string, params?: {
    since?: Date
    limit?: number
    offset?: number
  }): Promise<ExternalOrder[]> {
    // API key based - credentials stored differently
    return []
  }
}
