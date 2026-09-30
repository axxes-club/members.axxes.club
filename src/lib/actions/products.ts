import "server-only"
import { asc, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { axxesProduct } from "@/lib/db/schema"

/**
 * The AXXES catalog, grouped for the launcher.
 *
 * Read from the shared database rather than a local array so the portal, the
 * Handshake launcher and Lanes always describe the same set of products.
 */
export type ProductGroup = {
  category: string
  blurb: string
  products: Awaited<ReturnType<typeof getProducts>>
}

/**
 * Blurbs for the categories the launcher groups by.
 *
 * A category blurb is the one line a buyer reads for a whole group of
 * products, so it has to say what the group is FOR rather than list what is in
 * it. The Events/Commerce pair deliberately both land on reconciliation: that
 * is the single promise the whole catalog is making, and a group blurb is the
 * cheapest place to keep it true.
 *
 * `Work` still has an entry. Its products are currently all `surface_in_members
 * = false`, so this text is not reached today — it stays because the moment one
 * of them is switched back on, a missing key would render an empty subtitle
 * rather than a sentence.
 */
const CATEGORY_BLURBS: Record<string, string> = {
  Suite: "One workspace, one set of numbers.",
  Work: "Plan, organize and run the business.",
  Events: "The night itself: what was sold, who came, and what they did.",
  Commerce: "The money and the stock, reconciled against each other.",
  Support: "The conversation with the customer, and what it tells you.",
  Developers: "Build on AXXES.",
}

// `Work` sits last on purpose. It is the bucket a horizontal tool lands in, and
// keeping it at the end means unhiding one never re-splits the featured groups
// above it. `Support` goes before `Developers` because a desk is bought by
// operators and the API is not.
const CATEGORY_ORDER = ["Suite", "Events", "Commerce", "Support", "Developers", "Work"]

/** Every product the launcher shows, in catalog order. */
export async function getProducts() {
  return db
    .select()
    .from(axxesProduct)
    .where(eq(axxesProduct.surfaceInMembers, true))
    .orderBy(asc(axxesProduct.sortOrder))
}

/** The same list, bucketed by category with the category order preserved. */
export async function getProductGroups(): Promise<ProductGroup[]> {
  const products = await getProducts()

  const buckets = new Map<string, typeof products>()
  for (const p of products) {
    const list = buckets.get(p.category) ?? []
    list.push(p)
    buckets.set(p.category, list)
  }

  const known = CATEGORY_ORDER.filter((c) => buckets.has(c))
  const rest = [...buckets.keys()].filter((c) => !CATEGORY_ORDER.includes(c)).sort()

  return [...known, ...rest].map((category) => ({
    category,
    blurb: CATEGORY_BLURBS[category] ?? "",
    products: buckets.get(category)!,
  }))
}

/** A count for the header: how many of the catalog run on AXXES sign-in. */
export async function getCatalogStats() {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      sso: sql<number>`count(*) filter (where ${axxesProduct.sso})::int`,
      inPortal: sql<number>`count(*) filter (where ${axxesProduct.membersPath} is not null)::int`,
    })
    .from(axxesProduct)
    .where(eq(axxesProduct.surfaceInMembers, true))
  return row ?? { total: 0, sso: 0, inPortal: 0 }
}

/**
 * A product, plus the workspace to hand its deep links.
 *
 * `appTenantParam` is the tenant the person is currently looking at, so a link
 * out to an app carries the workspace they chose rather than dropping them into
 * whatever happens to be their primary one. Apps that ignore it are unaffected —
 * an unknown query parameter is not an error.
 */
export type CatalogProduct = Awaited<ReturnType<typeof getProducts>>[number] & {
  appTenantParam?: string
}

/** One product by catalog key, for a landing page. */
export async function getProduct(key: string) {
  if (!/^[a-z0-9-]{1,40}$/.test(key)) return undefined
  const [row] = await db
    .select()
    .from(axxesProduct)
    .where(eq(axxesProduct.key, key))
    .limit(1)
  return row
}
