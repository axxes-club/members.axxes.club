/**
 * Dropbox Integration Provider
 * Cloud storage integration for your digital asset management library
 */

import { db } from "@/lib/db"
import { assets } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { BaseIntegration } from "../base"
import type {
  OAuthConfig,
  IntegrationProviderMeta,
  SyncResult,
  ExternalEvent,
  ExternalOrder,
  SyncError,
  TokenInfo,
} from "../types"

const DROPBOX_BASE_URL = "https://api.dropboxapi.com"

export class DropboxIntegration extends BaseIntegration {
  readonly meta: IntegrationProviderMeta = {
    id: "dropbox",
    name: "Dropbox",
    description: "Cloud storage integration for your digital asset management library.",
    category: "storage",
    icon: "FolderOpen",
    website: "https://dropbox.com",
    authType: "oauth",
    features: ["assets"],
  }

  getOAuthConfig(): OAuthConfig {
    return {
      clientId: process.env.DROPBOX_CLIENT_ID!,
      clientSecret: process.env.DROPBOX_CLIENT_SECRET!,
      authorizeUrl: "https://www.dropbox.com/oauth2/authorize",
      tokenUrl: `${DROPBOX_BASE_URL}/oauth2/token`,
      userInfoUrl: `${DROPBOX_BASE_URL}/2/users/get_current_account`,
      revokeUrl: `${DROPBOX_BASE_URL}/2/auth/token/revoke`,
      scopes: ["files.metadata.read", "files.content.read"],
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/dropbox/callback`,
    }
  }

  /**
   * Exchange authorization code for tokens (Dropbox-specific)
   */
  override async exchangeCodeForTokens(code: string): Promise<TokenInfo> {
    const oauthConfig = this.getOAuthConfig()
    if (!oauthConfig) {
      throw new Error(`${this.meta.name} does not support OAuth`)
    }

    const response = await fetch(oauthConfig.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: oauthConfig.clientId,
        client_secret: oauthConfig.clientSecret,
        redirect_uri: oauthConfig.redirectUri,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error_description || "Failed to exchange authorization code")
    }

    const data = await response.json()

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scope: data.scope,
    }
  }

  /**
   * List files from Dropbox
   */
  async listFiles(accessToken: string, path = "", recursive = false): Promise<Array<{
    id: string
    name: string
    path: string
    size: number
    mimeType: string
    modifiedAt: string
    imageUrl?: string
  }>> {
    const response = await fetch(`${DROPBOX_BASE_URL}/2/files/list_folder`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: path || "",
        recursive,
        include_media_info: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.status}`)
    }

    const data = await response.json()
    
    return (data.entries || []).filter((entry: Record<string, unknown>) => 
      entry[".tag"] === "file"
    ).map((file: Record<string, unknown>) => {
      const mediaInfo = file.media_info as Record<string, unknown> | undefined
      const metadata = mediaInfo?.metadata as Record<string, unknown> | undefined
      
      return {
        id: file.id as string,
        name: file.name as string,
        path: file.path_display as string,
        size: file.size as number,
        mimeType: metadata?.mime_type as string || "application/octet-stream",
        modifiedAt: file.server_modified as string,
        imageUrl: metadata?.dimensions as Record<string, unknown> | undefined
          ? `/api/dropbox/thumbnail?id=${file.id}` 
          : undefined,
      }
    })
  }

  /**
   * Sync assets from Dropbox to local database
   */
  async syncAssets(tenantId: string): Promise<SyncResult> {
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
          entityType: "assets",
          pulled: 0,
          pushed: 0,
          updated: 0,
          failed: 1,
          errors: [{ message: "No valid access token" }],
          startedAt,
          completedAt: new Date(),
        }
      }

      const files = await this.listFiles(accessToken, "/assets", true)
      pulled = files.length

      for (const file of files) {
        try {
          // Check for existing asset by URL (path)
          const existingAsset = await db.query.assets.findFirst({
            where: and(
              eq(assets.tenantId, tenantId),
              eq(assets.url, file.path)
            ),
          })

          if (existingAsset) {
            await db.update(assets)
              .set({
                name: file.name,
                fileSize: file.size,
                mimeType: file.mimeType,
                updatedAt: new Date(),
              })
              .where(eq(assets.id, existingAsset.id))
            updated++
          } else {
            await db.insert(assets).values({
              tenantId,
              name: file.name,
              url: file.path,
              fileSize: file.size,
              mimeType: file.mimeType,
              source: "dropbox",
              originalFilename: file.name,
            })
            updated++
          }
        } catch (error) {
          failed++
          errors.push({
            externalId: file.id,
            message: error instanceof Error ? error.message : "Unknown error",
          })
        }
      }

      return {
        success: failed === 0,
        provider: this.meta.id,
        entityType: "assets",
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
        entityType: "assets",
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
