/**
 * White-label: an organization that uses the AXXES products under its own name.
 *
 * What makes an organization white-label lives in `tenants.settings.whiteLabel`
 * (on/off, its address, the words on its sign-in page). How it looks — name,
 * colors, logos, favicon — lives in its `brand_profiles` row, the same profile
 * Settings → Brand edits. Every *.axxes.club product and Handshake's branded
 * sign-in (handshake.axxes.club/o/<slug>) read those two places, so a customer
 * is configured once and looks the same everywhere.
 *
 * AXXES stays visible as a small "Powered by AXXES" line; there are no custom
 * domains yet — a customer's address is its slug on AXXES domains.
 */

export type LocalizedText = { es?: string; en?: string }

export type WhiteLabelSettings = {
  enabled: boolean
  /** The customer's address: handshake.axxes.club/o/<slug>. */
  slug: string
  login?: {
    headline?: LocalizedText
    tagline?: LocalizedText
    notice?: LocalizedText
  }
}

/** The organization whose members run AXXES itself and may provision customers. */
export const AXXES_STAFF_TENANT_ID =
  process.env.AXXES_STAFF_TENANT_ID || "40119de9-ef87-4e41-b479-7a28ec8e3d66"

/** Addresses no customer may take: they would shadow real routes or mislead. */
const RESERVED = new Set([
  "admin", "api", "app", "auth", "axxes", "handshake", "help", "login", "logout",
  "members", "o", "p", "settings", "sign-in", "sign-out", "sign-up", "static", "support", "www",
])

/** A lowercase address of letters, digits and single hyphens, 3–40 characters. */
export function validateSlug(value: string): string | null {
  const slug = value.trim().toLowerCase()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return "Use lowercase letters, numbers and single hyphens."
  if (slug.length < 3 || slug.length > 40) return "Use 3 to 40 characters."
  if (RESERVED.has(slug)) return "That address is reserved."
  return null
}

/** A tenant color must be a plain hex value before it reaches a style attribute. */
export function validHex(value: string | null | undefined): string | null {
  const color = (value ?? "").trim()
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? color : null
}

/** Only http(s) URLs for logos, so nothing like javascript: reaches an <img>. */
export function validUrl(value: string | null | undefined): string | null {
  const url = (value ?? "").trim()
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null
  } catch {
    return url.startsWith("/") && !url.startsWith("//") ? url : null
  }
}

function text(value: unknown, max: number): string | undefined {
  const s = typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : ""
  return s || undefined
}

function localized(value: unknown, max: number): LocalizedText | undefined {
  if (!value || typeof value !== "object") return undefined
  const v = value as Record<string, unknown>
  const out: LocalizedText = { es: text(v.es, max), en: text(v.en, max) }
  return out.es || out.en ? out : undefined
}

/** Reads settings.whiteLabel defensively; anything malformed means "not white-label". */
export function readWhiteLabel(settings: unknown): WhiteLabelSettings | null {
  const raw = (settings && typeof settings === "object" ? (settings as Record<string, unknown>).whiteLabel : null) as
    | Record<string, unknown>
    | null
  if (!raw || typeof raw !== "object" || typeof raw.slug !== "string") return null
  const login = (raw.login && typeof raw.login === "object" ? raw.login : {}) as Record<string, unknown>
  return {
    enabled: raw.enabled === true,
    slug: raw.slug,
    login: {
      headline: localized(login.headline, 120),
      tagline: localized(login.tagline, 200),
      notice: localized(login.notice, 400),
    },
  }
}

/** The right language, falling back to the other one. */
export function pick(value: LocalizedText | undefined, locale: string): string | null {
  if (!value) return null
  const order = locale.startsWith("es") ? [value.es, value.en] : [value.en, value.es]
  return order.find((v): v is string => typeof v === "string" && v.length > 0) ?? null
}

export { text as cleanText, localized as cleanLocalized }
