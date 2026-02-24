/**
 * Integration Types
 * Shared types for all integration providers
 */

// OAuth Configuration
export interface OAuthConfig {
  clientId: string
  clientSecret: string
  authorizeUrl: string
  tokenUrl: string
  userInfoUrl?: string
  revokeUrl?: string
  scopes: string[]
  redirectUri: string
}

// API Key Configuration
export interface ApiKeyConfig {
  keyName: string
  requiresAccountId: boolean
  validationUrl?: string
}

// Provider Metadata
export interface IntegrationProviderMeta {
  id: string
  name: string
  description: string
  category: IntegrationCategory
  icon: string // Lucide icon name
  website: string
  authType: "oauth" | "apikey"
  comingSoon?: boolean
  features: IntegrationFeature[]
}

export type IntegrationCategory = 
  | "ticketing" 
  | "venues" 
  | "orders" 
  | "shipping" 
  | "storage"
  | "marketing"
  | "crm"

export type IntegrationFeature = 
  | "events" 
  | "tickets" 
  | "orders" 
  | "venues"
  | "contacts"
  | "assets"
  | "sync"

// Connection State (for UI)
export interface ConnectionState {
  connected: boolean
  externalUserEmail?: string
  externalUserName?: string
  connectedAt?: string
  scopes?: string[]
  lastSyncAt?: string
  syncEnabled?: boolean
  health?: ConnectionHealth
}

export type ConnectionHealth = 
  | "healthy" 
  | "expired" 
  | "error" 
  | "unknown"

// Sync Types
export interface SyncResult {
  success: boolean
  provider: string
  entityType: SyncEntityType
  pulled: number
  pushed: number
  updated: number
  failed: number
  errors: SyncError[]
  startedAt: Date
  completedAt: Date
}

export type SyncEntityType = 
  | "events" 
  | "tickets" 
  | "orders" 
  | "venues"
  | "contacts"
  | "all"

export interface SyncError {
  entityId?: string
  externalId?: string
  message: string
  code?: string
}

// Webhook Events
export interface WebhookEvent {
  id: string
  provider: string
  eventType: string
  payload: Record<string, unknown>
  timestamp: Date
  signature?: string
}

export interface WebhookConfig {
  path: string
  secret?: string
  events: string[]
}

// Token Management
export interface TokenInfo {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  scope?: string
}

// External Entity Mappers
export interface ExternalEvent {
  id: string
  name: string
  description?: string
  startsAt: Date
  endsAt?: Date
  venue?: {
    name: string
    address?: string
  }
  status: string
  url?: string
  imageUrl?: string
  ticketTypes?: ExternalTicketType[]
}

export interface ExternalTicketType {
  id: string
  name: string
  price: number
  currency: string
  quantityTotal?: number
  quantitySold?: number
}

export interface ExternalOrder {
  id: string
  orderNumber: string
  customerEmail: string
  customerName?: string
  total: number
  currency: string
  status: string
  items: ExternalOrderItem[]
  createdAt: Date
}

export interface ExternalOrderItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  ticketTypeId?: string
  eventId?: string
}

// Provider-specific configuration stored in metadata
export interface IntegrationMetadata {
  // Feature toggles
  syncEnabled: boolean
  syncFrequency?: "realtime" | "hourly" | "daily"
  
  // Last sync times per entity
  lastEventSync?: string
  lastOrderSync?: string
  lastTicketSync?: string
  
  // Provider-specific settings
  [key: string]: unknown
}