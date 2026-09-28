import { and, count, eq, ilike, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm"
import { db } from "@/lib/db"
import { assets } from "@/lib/db/schema"
import { DAM_PAGE_SIZE, DAM_TYPES, damOrderBy, damTypeCondition, toDamAsset } from "./assets"
import { DAM_UNFILED, type DamOverview, type DamPage, type DamQuery } from "./types"

export async function queryDamAssets(tenantId: string, query: DamQuery): Promise<DamPage> {
  const conditions: SQL[] = [eq(assets.tenantId, tenantId)]

  const q = query.q?.trim()
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
    conditions.push(
      or(
        ilike(assets.name, pattern),
        ilike(assets.originalFilename, pattern),
        ilike(assets.description, pattern),
        sql`${assets.tags}::text ilike ${pattern}`
      )!
    )
  }
  if (query.type && DAM_TYPES.includes(query.type)) conditions.push(damTypeCondition(query.type))
  if (query.folder === DAM_UNFILED) conditions.push(isNull(assets.folder))
  else if (query.folder) conditions.push(eq(assets.folder, query.folder))

  const offset = Math.max(0, Math.floor(query.offset ?? 0))
  const where = and(...conditions)

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(assets)
      .where(where)
      .orderBy(...damOrderBy(query.sort))
      .limit(DAM_PAGE_SIZE)
      .offset(offset),
    db.select({ total: count() }).from(assets).where(where),
  ])

  return {
    assets: rows.map(toDamAsset),
    total,
    nextOffset: offset + rows.length < total ? offset + rows.length : null,
  }
}

export async function queryDamOverview(tenantId: string): Promise<DamOverview> {
  const [folders, [counts]] = await Promise.all([
    db
      .select({ name: assets.folder, count: count() })
      .from(assets)
      .where(and(eq(assets.tenantId, tenantId), isNotNull(assets.folder)))
      .groupBy(assets.folder)
      .orderBy(sql`lower(${assets.folder})`),
    db
      .select({
        all: count(),
        image: sql<number>`count(*) filter (where ${damTypeCondition("image")})`.mapWith(Number),
        video: sql<number>`count(*) filter (where ${damTypeCondition("video")})`.mapWith(Number),
        document: sql<number>`count(*) filter (where ${damTypeCondition("document")})`.mapWith(Number),
        unfiled: sql<number>`count(*) filter (where ${assets.folder} is null)`.mapWith(Number),
      })
      .from(assets)
      .where(eq(assets.tenantId, tenantId)),
  ])

  return {
    folders: folders.map((f) => ({ name: f.name!, count: f.count })),
    counts,
  }
}
