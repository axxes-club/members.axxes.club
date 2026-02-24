/**
 * Qortr Integration Provider
 * Venue rental marketplace for nightclubs, event spaces, and unique locations
 */

import { db } from "@/lib/db"
import { venues } from "@/lib/db/schema"
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

const QORTR_BASE_URL = "https://api.qortr.com"

export class QortrIntegration extends BaseIntegration {
  readonly meta: IntegrationProviderMeta = {
    id: "qortr",
    name: "Qortr",
    description: "Venue rental marketplace for nightclubs, event spaces, and unique locations.",
    category: "venues",
    icon: "Building2",
    website: "https://qortr.com",
    authType: "apikey",
    features: ["venues"],
  }

  getApiKeyConfig(): ApiKeyConfig {
    return {
      keyName: "Qortr API Key",
      requiresAccountId: true,
      validationUrl: `${QORTR_BASE_URL}/v1/auth/validate`,
    }
  }

  /**
   * Fetch venues from Qortr
   */
  async fetchVenues(apiKey: string, accountId: string): Promise<Array<{
    id: string
    name: string
    description?: string
    address: {
      street: string
      city: string
      state: string
      zip: string
      country: string
    }
    capacity: number
    amenities: string[]
    imageUrl?: string
    status: string
  }>> {
    const response = await fetch(`${QORTR_BASE_URL}/v1/venues`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "X-Account-Id": accountId,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch venues: ${response.status}`)
    }

    const data = await response.json()
    return data.venues || []
  }

  /**
   * Sync venues from Qortr to local database
   */
  async syncVenues(tenantId: string): Promise<SyncResult> {
    const startedAt = new Date()
    const errors: SyncError[] = []
    let pulled = 0
    let updated = 0
    let failed = 0

    try {
      const connection = await db.query.integrationConnection.findFirst({
        where: and(
          eq(venues.tenantId, tenantId),
          eq(venues.tenantId, tenantId)
        ),
      })

      const apiKey = connection?.apiKey
      const accountId = connection?.accountId

      if (!apiKey || !accountId) {
        return {
          success: false,
          provider: this.meta.id,
          entityType: "venues",
          pulled: 0,
          pushed: 0,
          updated: 0,
          failed: 1,
          errors: [{ message: "No API key or account ID configured" }],
          startedAt,
          completedAt: new Date(),
        }
      }

      const externalVenues = await this.fetchVenues(apiKey, accountId)
      pulled = externalVenues.length

      for (const externalVenue of externalVenues) {
        try {
          const existingVenue = await db.query.venues.findFirst({
            where: and(
              eq(venues.tenantId, tenantId),
              eq(venues.name, externalVenue.name)
            ),
          })

          const venueImages = externalVenue.imageUrl ? [externalVenue.imageUrl] : []

          if (existingVenue) {
            await db.update(venues)
              .set({
                description: externalVenue.description || existingVenue.description,
                addressLine1: externalVenue.address.street,
                city: externalVenue.address.city,
                state: externalVenue.address.state,
                postalCode: externalVenue.address.zip,
                country: externalVenue.address.country,
                capacity: externalVenue.capacity,
                images: venueImages.length ? venueImages : existingVenue.images,
                amenities: externalVenue.amenities,
                metadata: {
                  ...(existingVenue.metadata as Record<string, unknown> || {}),
                  externalVenueId: externalVenue.id,
                  externalPlatform: "qortr",
                  lastSyncedAt: new Date().toISOString(),
                },
                updatedAt: new Date(),
              })
              .where(eq(venues.id, existingVenue.id))
            updated++
          } else {
            await db.insert(venues).values({
              tenantId,
              name: externalVenue.name,
              description: externalVenue.description || null,
              addressLine1: externalVenue.address.street,
              city: externalVenue.address.city,
              state: externalVenue.address.state,
              postalCode: externalVenue.address.zip,
              country: externalVenue.address.country,
              capacity: externalVenue.capacity,
              images: venueImages,
              amenities: externalVenue.amenities,
              metadata: {
                externalVenueId: externalVenue.id,
                externalPlatform: "qortr",
                lastSyncedAt: new Date().toISOString(),
              },
            })
            updated++
          }
        } catch (error) {
          failed++
          errors.push({
            externalId: externalVenue.id,
            message: error instanceof Error ? error.message : "Unknown error",
          })
        }
      }

      return {
        success: failed === 0,
        provider: this.meta.id,
        entityType: "venues",
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
        entityType: "venues",
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

  async syncOrders(): Promise<SyncResult> {
    return {
      success: true,
      provider: this.meta.id,
      entityType: "orders",
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
    return []
  }
}
