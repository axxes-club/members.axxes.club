/**
 * Afters.am Integration Provider
 * Ticketing platform integration
 */

import { db } from "@/lib/db"
import { events, ticketTypes, orders, orderItems, contacts, venues } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { BaseIntegration } from "../base"
import type {
  OAuthConfig,
  IntegrationProviderMeta,
  SyncResult,
  ExternalEvent,
  ExternalOrder,
  SyncError,
} from "../types"

const AFTERS_BASE_URL = process.env.AFTERS_OAUTH_URL || "https://afters.am"

export class AftersIntegration extends BaseIntegration {
  readonly meta: IntegrationProviderMeta = {
    id: "afters",
    name: "Afters.am",
    description: "Our integrated ticketing platform for seamless event management and ticket sales.",
    category: "ticketing",
    icon: "Ticket",
    website: "https://afters.am",
    authType: "oauth",
    features: ["events", "tickets", "orders", "sync"],
  }

  getOAuthConfig(): OAuthConfig {
    return {
      clientId: process.env.AFTERS_CLIENT_ID!,
      clientSecret: process.env.AFTERS_CLIENT_SECRET!,
      authorizeUrl: `${AFTERS_BASE_URL}/oauth/authorize`,
      tokenUrl: `${AFTERS_BASE_URL}/api/oauth/token`,
      userInfoUrl: `${AFTERS_BASE_URL}/api/oauth/userinfo`,
      revokeUrl: `${AFTERS_BASE_URL}/api/oauth/revoke`,
      scopes: [
        "read:profile",
        "read:events",
        "read:orders",
        "read:tickets",
        "write:events",
      ],
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/afters/callback`,
    }
  }

  /**
   * Fetch events from Afters
   */
  async fetchExternalEvents(accessToken: string, params?: {
    since?: Date
    limit?: number
    offset?: number
  }): Promise<ExternalEvent[]> {
    const url = new URL(`${AFTERS_BASE_URL}/api/v1/events`)
    
    if (params?.since) {
      url.searchParams.set("since", params.since.toISOString())
    }
    if (params?.limit) {
      url.searchParams.set("limit", params.limit.toString())
    }
    if (params?.offset) {
      url.searchParams.set("offset", params.offset.toString())
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.status}`)
    }

    const data = await response.json()
    
    // Transform Afters events to our format
    return (data.events || []).map((event: Record<string, unknown>) => ({
      id: event.id as string,
      name: event.name as string,
      description: event.description as string | undefined,
      startsAt: new Date(event.starts_at as string),
      endsAt: event.ends_at ? new Date(event.ends_at as string) : undefined,
      venue: event.venue ? {
        name: (event.venue as Record<string, unknown>).name as string,
        address: (event.venue as Record<string, unknown>).address as string | undefined,
      } : undefined,
      status: event.status as string,
      url: event.url as string | undefined,
      imageUrl: event.cover_image_url as string | undefined,
      ticketTypes: (event.ticket_types as Array<Record<string, unknown>> | undefined)?.map((tt) => ({
        id: tt.id as string,
        name: tt.name as string,
        price: parseFloat(tt.price as string || "0"),
        currency: (tt.currency as string) || "USD",
        quantityTotal: tt.quantity_total as number | undefined,
        quantitySold: tt.quantity_sold as number | undefined,
      })),
    }))
  }

  /**
   * Fetch orders from Afters
   */
  async fetchExternalOrders(accessToken: string, params?: {
    since?: Date
    limit?: number
    offset?: number
  }): Promise<ExternalOrder[]> {
    const url = new URL(`${AFTERS_BASE_URL}/api/v1/orders`)
    
    if (params?.since) {
      url.searchParams.set("since", params.since.toISOString())
    }
    if (params?.limit) {
      url.searchParams.set("limit", params.limit.toString())
    }
    if (params?.offset) {
      url.searchParams.set("offset", params.offset.toString())
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
      items: (order.items as Array<Record<string, unknown>>).map((item) => ({
        id: item.id as string,
        name: item.name as string,
        quantity: item.quantity as number,
        unitPrice: parseFloat(item.unit_price as string || "0"),
        ticketTypeId: item.ticket_type_id as string | undefined,
        eventId: item.event_id as string | undefined,
      })),
      createdAt: new Date(order.created_at as string),
    }))
  }

  /**
   * Sync events from Afters to local database
   */
  async syncEvents(tenantId: string, fullSync = false): Promise<SyncResult> {
    const startedAt = new Date()
    const errors: SyncError[] = []
    let pulled = 0
    let updated = 0
    let failed = 0

    try {
      const accessToken = await this.getValidAccessToken(tenantId)
      if (!accessToken) {
        return {
          success: false,
          provider: this.meta.id,
          entityType: "events",
          pulled: 0,
          pushed: 0,
          updated: 0,
          failed: 1,
          errors: [{ message: "No valid access token" }],
          startedAt,
          completedAt: new Date(),
        }
      }

      // Get last sync time for incremental sync
      const connection = await db.query.integrationConnection.findFirst({
        where: and(
          eq(integrationConnection.tenantId, tenantId),
          eq(integrationConnection.provider, this.meta.id)
        ),
      })
      
      const metadata = connection?.metadata as { lastEventSync?: string } | null
      const since = fullSync ? undefined : metadata?.lastEventSync ? new Date(metadata.lastEventSync) : undefined

      const externalEvents = await this.fetchExternalEvents(accessToken, { since })
      pulled = externalEvents.length

      for (const externalEvent of externalEvents) {
        try {
          // Find or create venue
          let venueId: string | null = null
          if (externalEvent.venue) {
            const existingVenue = await db.query.venues.findFirst({
              where: and(
                eq(venues.tenantId, tenantId),
                eq(venues.name, externalEvent.venue.name)
              ),
            })
            
            if (existingVenue) {
              venueId = existingVenue.id
            } else {
              const [newVenue] = await db.insert(venues).values({
                tenantId,
                name: externalEvent.venue.name,
                addressLine1: externalEvent.venue.address || null,
              }).returning()
              venueId = newVenue.id
            }
          }

          // Check if event already exists
          const existingEvent = await db.query.events.findFirst({
            where: and(
              eq(events.tenantId, tenantId),
              eq(events.externalEventId, externalEvent.id),
              eq(events.externalPlatform, "afters")
            ),
          })

          const eventStatus = this.mapEventStatus(externalEvent.status)

          if (existingEvent) {
            // Update existing event
            await db.update(events)
              .set({
                name: externalEvent.name,
                description: externalEvent.description || existingEvent.description,
                startsAt: externalEvent.startsAt,
                endsAt: externalEvent.endsAt || existingEvent.endsAt,
                venueId: venueId || existingEvent.venueId,
                status: eventStatus,
                coverImageUrl: externalEvent.imageUrl || existingEvent.coverImageUrl,
                externalUrl: externalEvent.url || existingEvent.externalUrl,
                lastSyncedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(events.id, existingEvent.id))
            
            updated++
          } else {
            // Create new event
            const slug = externalEvent.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "")
              .substring(0, 50) + "-" + nanoid(6)

            const [newEvent] = await db.insert(events).values({
              tenantId,
              name: externalEvent.name,
              slug,
              description: externalEvent.description || null,
              startsAt: externalEvent.startsAt,
              endsAt: externalEvent.endsAt || null,
              venueId,
              status: eventStatus,
              coverImageUrl: externalEvent.imageUrl || null,
              externalEventId: externalEvent.id,
              externalPlatform: "afters",
              externalUrl: externalEvent.url || null,
              syncEnabled: true,
              lastSyncedAt: new Date(),
            }).returning()

            // Create ticket types
            if (externalEvent.ticketTypes) {
              for (const tt of externalEvent.ticketTypes) {
                await db.insert(ticketTypes).values({
                  tenantId,
                  eventId: newEvent.id,
                  name: tt.name,
                  price: tt.price.toString(),
                  currency: tt.currency,
                  quantityTotal: tt.quantityTotal || null,
                  quantitySold: tt.quantitySold || 0,
                  externalTicketTypeId: tt.id,
                })
              }
            }

            updated++
          }
        } catch (error) {
          failed++
          errors.push({
            externalId: externalEvent.id,
            message: error instanceof Error ? error.message : "Unknown error",
          })
        }
      }

      // Update last sync time
      if (connection) {
        await db.update(integrationConnection)
          .set({
            lastSyncAt: new Date(),
            metadata: {
              ...(connection.metadata as Record<string, unknown> || {}),
              lastEventSync: new Date().toISOString(),
            },
            updatedAt: new Date(),
          })
          .where(eq(integrationConnection.id, connection.id))
      }

      return {
        success: failed === 0,
        provider: this.meta.id,
        entityType: "events",
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
        entityType: "events",
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

  /**
   * Sync orders from Afters to local database
   */
  async syncOrders(tenantId: string, fullSync = false): Promise<SyncResult> {
    const startedAt = new Date()
    const errors: SyncError[] = []
    let pulled = 0
    let updated = 0
    let failed = 0

    try {
      const accessToken = await this.getValidAccessToken(tenantId)
      if (!accessToken) {
        return {
          success: false,
          provider: this.meta.id,
          entityType: "orders",
          pulled: 0,
          pushed: 0,
          updated: 0,
          failed: 1,
          errors: [{ message: "No valid access token" }],
          startedAt,
          completedAt: new Date(),
        }
      }

      const connection = await db.query.integrationConnection.findFirst({
        where: and(
          eq(integrationConnection.tenantId, tenantId),
          eq(integrationConnection.provider, this.meta.id)
        ),
      })
      
      const metadata = connection?.metadata as { lastOrderSync?: string } | null
      const since = fullSync ? undefined : metadata?.lastOrderSync ? new Date(metadata.lastOrderSync) : undefined

      const externalOrders = await this.fetchExternalOrders(accessToken, { since })
      pulled = externalOrders.length

      for (const externalOrder of externalOrders) {
        try {
          // Find or create contact
          let contactId: string | null = null
          const existingContact = await db.query.contacts.findFirst({
            where: and(
              eq(contacts.tenantId, tenantId),
              eq(contacts.email, externalOrder.customerEmail)
            ),
          })
          
          if (existingContact) {
            contactId = existingContact.id
          } else if (externalOrder.customerEmail) {
            const nameParts = externalOrder.customerName?.split(" ") || []
            const [newContact] = await db.insert(contacts).values({
              tenantId,
              email: externalOrder.customerEmail,
              firstName: nameParts[0] || null,
              lastName: nameParts.slice(1).join(" ") || null,
            }).returning()
            contactId = newContact.id
          }

          // Check if order already exists
          const existingOrder = await db.query.orders.findFirst({
            where: and(
              eq(orders.tenantId, tenantId),
              eq(orders.externalOrderId, externalOrder.id),
              eq(orders.externalPlatform, "afters")
            ),
          })

          if (existingOrder) {
            // Update existing order
            await db.update(orders)
              .set({
                status: this.mapOrderStatus(externalOrder.status),
                paymentStatus: externalOrder.status === "completed" ? "captured" : "pending",
                updatedAt: new Date(),
              })
              .where(eq(orders.id, existingOrder.id))
            
            updated++
          } else {
            // Create new order
            const [newOrder] = await db.insert(orders).values({
              tenantId,
              orderNumber: externalOrder.orderNumber || `AFT-${nanoid(8)}`,
              contactId,
              customerEmail: externalOrder.customerEmail,
              customerFirstName: externalOrder.customerName?.split(" ")[0] || null,
              customerLastName: externalOrder.customerName?.split(" ").slice(1).join(" ") || null,
              status: this.mapOrderStatus(externalOrder.status),
              paymentStatus: externalOrder.status === "completed" ? "captured" : "pending",
              total: externalOrder.total.toString(),
              currency: externalOrder.currency,
              source: "afters",
              externalOrderId: externalOrder.id,
              externalPlatform: "afters",
              paidAt: externalOrder.status === "completed" ? externalOrder.createdAt : null,
            }).returning()

            // Create order items
            for (const item of externalOrder.items) {
              // Find local event and ticket type
              let eventId: string | null = null
              let ticketTypeId: string | null = null
              
              if (item.eventId) {
                const localEvent = await db.query.events.findFirst({
                  where: and(
                    eq(events.tenantId, tenantId),
                    eq(events.externalEventId, item.eventId),
                    eq(events.externalPlatform, "afters")
                  ),
                })
                if (localEvent) {
                  eventId = localEvent.id
                  
                  if (item.ticketTypeId) {
                    const localTicketType = await db.query.ticketTypes.findFirst({
                      where: and(
                        eq(ticketTypes.eventId, localEvent.id),
                        eq(ticketTypes.externalTicketTypeId, item.ticketTypeId)
                      ),
                    })
                    if (localTicketType) {
                      ticketTypeId = localTicketType.id
                    }
                  }
                }
              }

              await db.insert(orderItems).values({
                tenantId,
                orderId: newOrder.id,
                type: "ticket",
                eventId,
                ticketTypeId,
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

      // Update last sync time
      if (connection) {
        await db.update(integrationConnection)
          .set({
            metadata: {
              ...(connection.metadata as Record<string, unknown> || {}),
              lastOrderSync: new Date().toISOString(),
            },
            updatedAt: new Date(),
          })
          .where(eq(integrationConnection.id, connection.id))
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

  /**
   * Handle webhook events from Afters
   */
  async handleWebhook(event: {
    eventType: string
    payload: Record<string, unknown>
    signature?: string
  }): Promise<{ success: boolean; action?: string }> {
    try {
      switch (event.eventType) {
        case "event.created":
        case "event.updated": {
          const tenantId = event.payload.tenant_id as string
          if (tenantId) {
            const result=await this.syncEvents(tenantId, false)
            if(!result.success)return {success:false}
          }
          return { success: true, action: "synced_event" }
        }
        
        case "order.created":
        case "order.updated": {
          const tenantId = event.payload.tenant_id as string
          if (tenantId) {
            const result=await this.syncOrders(tenantId, false)
            if(!result.success)return {success:false}
          }
          return { success: true, action: "synced_order" }
        }
        
        case "ticket.sold": {
          const tenantId = event.payload.tenant_id as string
          if (tenantId) {
            const result=await this.syncOrders(tenantId, false)
            if(!result.success)return {success:false}
          }
          return { success: true, action: "synced_tickets" }
        }
        
        default:
          return { success: true, action: "ignored" }
      }
    } catch {
      return { success: false }
    }
  }

  // Helper methods

  private mapEventStatus(status: string): "draft" | "published" | "cancelled" | "completed" {
    switch (status.toLowerCase()) {
      case "active":
      case "live":
      case "published":
        return "published"
      case "cancelled":
        return "cancelled"
      case "completed":
      case "ended":
        return "completed"
      default:
        return "draft"
    }
  }

  private mapOrderStatus(status: string): "pending" | "confirmed" | "cancelled" | "refunded" {
    switch (status.toLowerCase()) {
      case "completed":
      case "paid":
      case "confirmed":
        return "confirmed"
      case "cancelled":
        return "cancelled"
      case "refunded":
        return "refunded"
      default:
        return "pending"
    }
  }
}

// Import for the integration connection type
import { integrationConnection } from "@/lib/db/schema"