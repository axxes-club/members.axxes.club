/**
 * Integration Registry
 * Central place to register and access all integration providers
 */

import { AftersIntegration } from "./providers/afters"
import type { BaseIntegration } from "./base"
import type { IntegrationProviderMeta, IntegrationCategory } from "./types"

// Registry of all available integrations
const integrations: Map<string, BaseIntegration> = new Map()

// Register integrations
export function registerIntegration(integration: BaseIntegration): void {
  integrations.set(integration.meta.id, integration)
}

// Get integration by provider ID
export function getIntegration(providerId: string): BaseIntegration | undefined {
  return integrations.get(providerId)
}

// Get all registered integrations
export function getAllIntegrations(): BaseIntegration[] {
  return Array.from(integrations.values())
}

// Get all integration metadata (for UI)
export function getIntegrationProviders(): IntegrationProviderMeta[] {
  return Array.from(integrations.values()).map(i => i.meta)
}

// Get integrations by category
export function getIntegrationsByCategory(category: IntegrationCategory): BaseIntegration[] {
  return Array.from(integrations.values()).filter(i => i.meta.category === category)
}

// Get integrations grouped by category
export function getIntegrationsGrouped(): Record<IntegrationCategory, IntegrationProviderMeta[]> {
  const grouped: Record<IntegrationCategory, IntegrationProviderMeta[]> = {
    ticketing: [],
    venues: [],
    orders: [],
    shipping: [],
    storage: [],
    marketing: [],
    crm: [],
  }
  
  for (const integration of integrations.values()) {
    grouped[integration.meta.category].push(integration.meta)
  }
  
  return grouped
}

// ============================================
// Register built-in integrations
// ============================================

// Afters (ticketing)
registerIntegration(new AftersIntegration())

// Future integrations can be registered here:
// registerIntegration(new QortrIntegration())
// registerIntegration(new PeerspaceIntegration())
// registerIntegration(new ShipStationIntegration())
// registerIntegration(new DropboxIntegration())

// Re-export types
export * from "./types"
export { BaseIntegration } from "./base"
export { AftersIntegration } from "./providers/afters"