type CatalogProduct = { key: string; name: string; description: string; tagline: string; url: string; color: string; status: string; sso: boolean }
const workspaceApps = new Set(["atelier", "suite", "lanes", "folders", "nexus", "pulse", "matter", "relay", "vibez", "office", "manifest", "tollbooth", "developer", "keel", "binnacle", "krates"])

// Explicit fields only: the public launcher must never expose account metadata.
export function publicCatalogProduct(product: CatalogProduct) {
  // `suite` is the Club portal, not a general app. Keep its internal catalog
  // record and integrations; omit it only from the shared public app switcher.
  // Private operations, Stock and identity stay reachable outside discovery,
  // regardless of stale catalog visibility flags.
  if (["suite", "manifest", "stock", "webmaster", "wm", "handshake", "account"].includes(product.key.toLowerCase())) return null
  if (product.status !== "live" && product.status !== "beta") return null
  try {
    const url = new URL(product.url)
    if (url.protocol !== "https:" || url.username || url.password) return null
    if (["manifest.axxes.club", "stock.axxes.app", "wm.axxes.app", "handshake.axxes.club"].includes(url.hostname)) return null
  } catch { return null }
  return { key: product.key, name: product.name.replace(/\bAXXES Pay\b/g, "Payments"), description: product.description.replace(/\bAXXES Pay\b/g, "Payments"), tagline: product.tagline.replace(/\bAXXES Pay\b/g, "Payments"), url: product.url, color: product.color, status: product.status, sso: product.sso, workspaceLaunch: workspaceApps.has(product.key) }
}
