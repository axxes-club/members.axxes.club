type CatalogProduct = { key: string; name: string; description: string; tagline: string; url: string; color: string; status: string; sso: boolean }
const workspaceApps = new Set(["atelier", "suite", "lanes", "folders", "nexus", "pulse", "matter", "relay", "vibez", "office", "manifest", "tollbooth", "developer", "keel", "binnacle", "krates"])

// Explicit fields only: the public launcher must never expose account metadata.
export function publicCatalogProduct(product: CatalogProduct) {
  // `suite` is the Club portal, not a general app. Keep its internal catalog
  // record and integrations; omit it only from the shared public app switcher.
  if (product.key === "suite") return null
  if (product.status !== "live" && product.status !== "beta") return null
  try { if (new URL(product.url).protocol !== "https:") return null } catch { return null }
  return { key: product.key, name: product.name, description: product.description, tagline: product.tagline, url: product.url, color: product.color, status: product.status, sso: product.sso, workspaceLaunch: workspaceApps.has(product.key) }
}
