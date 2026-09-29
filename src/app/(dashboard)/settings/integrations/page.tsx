import { getIntegrationsGrouped } from "@/lib/integrations"
import { IntegrationsClient } from "./integrations-client"

export const dynamic = "force-dynamic"

/**
 * The integrations surface.
 *
 * The provider list comes from the integration registry, not from a list typed
 * into the client component. It used to be duplicated there, which is how a
 * provider could be fully implemented, registered, and still missing from the
 * page — the registry is the thing that actually works, so it is the thing the
 * page should read. Adding a provider now means writing one class and
 * registering it in index.ts, and the card appears here by itself.
 */
export default function IntegrationsSettingsPage() {
  const grouped = getIntegrationsGrouped()
  return <IntegrationsClient grouped={grouped} />
}