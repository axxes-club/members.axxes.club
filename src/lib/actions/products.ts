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

const CATEGORY_BLURBS: Record<string, string> = {
  Suite: "Everything together, in one workspace.",
  Work: "Plan, organize and run the business.",
  Events: "Everything around a night out.",
  Commerce: "Get paid and keep stock moving.",
  Developers: "Build on AXXES.",
}

const CATEGORY_ORDER = ["Suite", "Work", "Events", "Commerce", "Developers"]

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
