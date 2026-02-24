/**
 * Peerspace Integration Provider
 * Book unique spaces for events, meetings, and productions by the hour
 */

import { db } from "@/lib/db"
import { venues } from "@/lib/db/schema/events"
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

const PEERSPACE_BASE_URL = "https://api.peerspace.com"

export class PeerspaceIntegration extends BaseIntegration {
  readonly meta: IntegrationProviderMeta = {
    id: "peerspace",
    name: "Peerspace",
    description: "Book unique spaces for events, meetings, and productions by the hour.",
    category: "venues",
    icon: "Building2",
    website: "https://peerspace.com",
    authType: "apikey",
    comingSoon: true,
    features: ["venues"],
  }

  getApiKeyConfig(): ApiKeyConfig {
    return {
      keyName: "Peerspace API Key",
      requiresAccountId: false,
      validationUrl: `${PEERSPACE_BASE_URL}/v1/auth/validate`,
    }
  }

  /**
   * Fetch locations from Peerspace
   */
  async fetchLocations(apiKey: string): Promise<Array<{
    id: string
    title: string
    description?: string
    location: {
      address: string
      city: string
      state: string
      zip: string
      country: string
      lat: number
      lng: number
    }
    capacity: number
    amenities: string[]
    photos: Array<{ url: string }>
    status: string
  }>> {
    const response = await fetch(`${PEERSPACE_BASE_URL}/v1/locations`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch locations: ${response.status}`)
    }

    const data = await response.json()
    return data.locations || []
  }

  /**
   * Sync locations from Peerspace to local database
   */
  async syncLocations(tenantId: string): Promise<SyncResult> {
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

      if (!apiKey) {
        return {
          success: false,
          provider: this.meta.id,
          entityType: "venues",
          pulled: 0,
          pushed: 0,
          updated: 0,
          failed: 1,
          errors: [{ message: "No API key configured" }],
          startedAt,
          completedAt: new Date(),
        }
      }

      const externalLocations = await this.fetchLocations(apiKey)
      pulled = externalLocations.length

      for (const externalLocation of externalLocations) {
        try {
          // Check for existing venue by name (since no external ID field exists)
          const existingVenue = await db.query.venues.findFirst({
            where: and(
              eq(venues.tenantId, tenantId),
              eq(venues.name, externalLocation.title)
            ),
          })

          const venueData = {
            name: externalLocation.title,
            description: externalLocation.description || null,
            addressLine1: externalLocation.location.address,
            city: externalLocation.location.city,
            state: externalLocation.location.state,
            postalCode: externalLocation.location.zip,
            country: externalLocation.location.country,
            capacity: externalLocation.capacity,
            images: externalLocation.photos.map(p => p.url),
            amenities: externalLocation.amenities,
          }

          if (existingVenue) {
            await db.update(venues)
              .set({
                ...venueData,
                metadata: {
                  ...(existingVenue.metadata as Record<string, unknown> || {}),
                  peerspaceId: externalLocation.id,
                  lastSyncedAt: new Date().toISOString(),
                },
                updatedAt: new Date(),
              })
              .where(eq(venues.id, existingVenue.id))
            updated++
          } else {
            await db.insert(venues).values({
              tenantId,
              ...venueData,
              metadata: {
                peerspaceId: externalLocation.id,
                source: "peerspace",
                lastSyncedAt: new Date().toISOString(),
              },
            })
            updated++
          }
        } catch (error) {
          failed++
          errors.push({
            externalId: externalLocation.id,
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