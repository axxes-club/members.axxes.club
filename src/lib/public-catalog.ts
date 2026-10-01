type CatalogProduct = { key: string; name: string; description: string; tagline: string; url: string; color: string; status: string; sso: boolean }
const workspaceApps = new Set(["suite", "lanes", "folders", "nexus", "pulse", "matter", "relay", "vibez", "office", "manifest", "tollbooth", "developer", "keel", "binnacle", "krates"])

// Explicit fields only: the public launcher must never expose account metadata.
export function publicCatalogProduct(product: CatalogProduct) {
  if (product.status !== "live" && product.status !== "beta") return null
  try { if (new URL(product.url).protocol !== "https:") return null } catch { return null }
  return { key: product.key, name: product.name, description: product.description, tagline: product.tagline, url: product.url, color: product.color, status: product.status, sso: product.sso, workspaceLaunch: workspaceApps.has(product.key) }
}
