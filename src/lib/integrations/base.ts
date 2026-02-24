/**
 * Base Integration Service
 * Abstract class that all integration providers must extend
 */

import { db } from "@/lib/db"
import { integrationConnection } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import type {
  OAuthConfig,
  ApiKeyConfig,
  IntegrationProviderMeta,
  ConnectionState,
  ConnectionHealth,
  SyncResult,
  TokenInfo,
  ExternalEvent,
  ExternalOrder,
  IntegrationMetadata,
} from "./types"

export abstract class BaseIntegration {
  abstract readonly meta: IntegrationProviderMeta
  
  /**
   * Get the OAuth configuration for this provider
   * Override if provider supports OAuth
   */
  getOAuthConfig(): OAuthConfig | null {
    return null
  }
  
  /**
   * Get the API key configuration for this provider
   * Override if provider supports API key auth
   */
  getApiKeyConfig(): ApiKeyConfig | null {
    return null
  }
  
  /**
   * Generate the authorization URL for OAuth flow
   */
  async getAuthorizationUrl(
    tenantId: string,
    userId: string,
    scopes?: string[]
  ): Promise<string | null> {
    const oauthConfig = this.getOAuthConfig()
    if (!oauthConfig) {
      throw new Error(`${this.meta.name} does not support OAuth`)
    }
    
    const state = Buffer.from(JSON.stringify({
      tenantId,
      userId,
      provider: this.meta.id,
      timestamp: Date.now(),
    })).toString("base64url")
    
    const requestedScopes = scopes || oauthConfig.scopes
    
    const url = new URL(oauthConfig.authorizeUrl)
    url.searchParams.set("client_id", oauthConfig.clientId)
    url.searchParams.set("redirect_uri", oauthConfig.redirectUri)
    url.searchParams.set("response_type", "code")
    url.searchParams.set("scope", requestedScopes.join(" "))
    url.searchParams.set("state", state)
    
    return url.toString()
  }
  
  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<TokenInfo> {
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
   * Refresh an expired access token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenInfo> {
    const oauthConfig = this.getOAuthConfig()
    if (!oauthConfig) {
      throw new Error(`${this.meta.name} does not support OAuth`)
    }
    
    const response = await fetch(oauthConfig.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: oauthConfig.clientId,
        client_secret: oauthConfig.clientSecret,
      }),
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error_description || "Failed to refresh token")
    }
    
    const data = await response.json()
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scope: data.scope,
    }
  }
  
  /**
   * Revoke access for a connection
   */
  async revokeAccess(accessToken: string): Promise<boolean> {
    const oauthConfig = this.getOAuthConfig()
    if (!oauthConfig?.revokeUrl) {
      // Provider doesn't support token revocation
      return true
    }
    
    try {
      await fetch(oauthConfig.revokeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: accessToken }),
      })
      return true
    } catch {
      return false
    }
  }
  
  /**
   * Get user info from the external provider
   */
  async getUserInfo(accessToken: string): Promise<{
    id?: string
    email?: string
    name?: string
  }> {
    const oauthConfig = this.getOAuthConfig()
    if (!oauthConfig?.userInfoUrl) {
      return {}
    }
    
    try {
      const response = await fetch(oauthConfig.userInfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      
      if (!response.ok) {
        return {}
      }
      
      return await response.json()
    } catch {
      return {}
    }
  }
  
  /**
   * Validate an API key
   */
  async validateApiKey(apiKey: string, accountId?: string): Promise<boolean> {
    const apiKeyConfig = this.getApiKeyConfig()
    if (!apiKeyConfig?.validationUrl) {
      // If no validation URL, assume valid
      return true
    }
    
    try {
      const response = await fetch(apiKeyConfig.validationUrl, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          ...(accountId && { "X-Account-Id": accountId }),
        },
      })
      
      return response.ok
    } catch {
      return false
    }
  }
  
  /**
   * Check connection health
   */
  async checkHealth(connection: typeof integrationConnection.$inferSelect): Promise<ConnectionHealth> {
    // Check if token is expired
    if (connection.accessTokenExpiresAt && new Date() > connection.accessTokenExpiresAt) {
      // Try to refresh
      if (connection.refreshToken) {
        try {
          const newTokens = await this.refreshAccessToken(connection.refreshToken)
          
          await db.update(integrationConnection)
            .set({
              accessToken: newTokens.accessToken,
              refreshToken: newTokens.refreshToken,
              accessTokenExpiresAt: newTokens.expiresAt,
              updatedAt: new Date(),
            })
            .where(eq(integrationConnection.id, connection.id))
          
          return "healthy"
        } catch {
          return "expired"
        }
      }
      return "expired"
    }
    
    return "healthy"
  }
  
  /**
   * Get connection state for UI
   */
  async getConnectionState(tenantId: string): Promise<ConnectionState> {
    const connection = await db.query.integrationConnection.findFirst({
      where: and(
        eq(integrationConnection.tenantId, tenantId),
        eq(integrationConnection.provider, this.meta.id),
        eq(integrationConnection.isActive, true)
      ),
    })
    
    if (!connection) {
      return { connected: false, health: "unknown" }
    }
    
    const health = await this.checkHealth(connection)
    const metadata = connection.metadata as IntegrationMetadata | null
    
    return {
      connected: true,
      externalUserEmail: connection.externalUserEmail || undefined,
      externalUserName: connection.externalUserName || undefined,
      connectedAt: connection.createdAt?.toISOString(),
      scopes: connection.scope?.split(" "),
      lastSyncAt: connection.lastSyncAt?.toISOString(),
      syncEnabled: metadata?.syncEnabled ?? false,
      health,
    }
  }
  
  /**
   * Get a valid access token, refreshing if necessary
   */
  async getValidAccessToken(tenantId: string): Promise<string | null> {
    const connection = await db.query.integrationConnection.findFirst({
      where: and(
        eq(integrationConnection.tenantId, tenantId),
        eq(integrationConnection.provider, this.meta.id),
        eq(integrationConnection.isActive, true)
      ),
    })
    
    if (!connection?.accessToken) {
      return null
    }
    
    // Check if token needs refresh
    if (connection.accessTokenExpiresAt && new Date() >= connection.accessTokenExpiresAt) {
      if (!connection.refreshToken) {
        return null
      }
      
      try {
        const newTokens = await this.refreshAccessToken(connection.refreshToken)
        
        await db.update(integrationConnection)
          .set({
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            accessTokenExpiresAt: newTokens.expiresAt,
            updatedAt: new Date(),
          })
          .where(eq(integrationConnection.id, connection.id))
        
        return newTokens.accessToken
      } catch {
        return null
      }
    }
    
    return connection.accessToken
  }
  
  // Abstract methods that must be implemented by each provider
  
  /**
   * Sync events from the external provider
   */
  abstract syncEvents(tenantId: string, fullSync?: boolean): Promise<SyncResult>
  
  /**
   * Sync orders from the external provider
   */
  abstract syncOrders(tenantId: string, fullSync?: boolean): Promise<SyncResult>
  
  /**
   * Handle webhook event
   */
  abstract handleWebhook(event: {
    eventType: string
    payload: Record<string, unknown>
    signature?: string
  }): Promise<{ success: boolean; action?: string }>
  
  /**
   * Fetch external events (provider-specific)
   */
  abstract fetchExternalEvents(accessToken: string, params?: {
    since?: Date
    limit?: number
    offset?: number
  }): Promise<ExternalEvent[]>
  
  /**
   * Fetch external orders (provider-specific)
   */
  abstract fetchExternalOrders(accessToken: string, params?: {
    since?: Date
    limit?: number
    offset?: number
  }): Promise<ExternalOrder[]>
}