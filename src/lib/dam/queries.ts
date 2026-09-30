import { and, count, eq, ilike, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm"
import { db } from "@/lib/db"
import { assetAppLinks, assets } from "@/lib/db/schema"
import { DAM_PAGE_SIZE, DAM_TYPES, damOrderBy, damTypeCondition, toDamAsset } from "./assets"
import { DAM_UNFILED, type DamAppLink, type DamOverview, type DamPage, type DamQuery } from "./types"

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
      .select({
        row: assets,
        // An asset can be attached to several apps at once, so the links come
        // back as a json array rather than a second row per app. Scoped to the
        // workspace: a link row is not permission to read another tenant's file.
        appLinks: sql<
          { appKey: string; recordId: string }[] | null
        >`(select coalesce(json_agg(json_build_object(
              'appKey', ${assetAppLinks.appKey},
              'recordId', ${assetAppLinks.recordId}::text
            )), '[]'::json)
            from ${assetAppLinks}
            where ${assetAppLinks.assetId} = ${assets.id}
              and ${assetAppLinks.tenantId} = ${tenantId})`,
      })
      .from(assets)
      .where(where)
      .orderBy(...damOrderBy(query.sort))
      .limit(DAM_PAGE_SIZE)
      .offset(offset),
    db.select({ total: count() }).from(assets).where(where),
  ])

  return {
    assets: rows.map((r) => toDamAsset(r.row, (r.appLinks ?? []) as DamAppLink[])),
    total,
    nextOffset: offset + rows.length < total ? offset + rows.length : null,
  }
}

export async function queryDamOverview(tenantId: string): Promise<DamOverview> {
  const [folders, [counts], registered] = await Promise.all([
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
    // Folders an app has registered but that hold nothing yet.
    //
    // The folder list above is derived from `assets.folder`, which means an
    // empty folder is invisible — a workspace would not see "Support" until
    // somebody attached a file. An app that promises to create its folder in
    // every workspace therefore needs a row to point at, and the union below is
    // what makes that promise true before the first upload.
    registeredFolders(tenantId),
  ])

  const byName = new Map(folders.map((f) => [f.name!, f.count]))
  for (const r of registered) if (!byName.has(r.name)) byName.set(r.name, 0)

  return {
    folders: [...byName.entries()]
      .map(([name, n]) => ({ name, count: n }))
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())),
    counts,
  }
}

/**
 * App-registered folders for a workspace, as {name, count}.
 *
 * Read defensively: this table is owned by Binnacle and may not exist in a
 * database that predates it. A missing table means no registered folders, which
 * is the correct reading — it must never take the Folders browser down.
 */
async function registeredFolders(tenantId: string): Promise<{ name: string; count: number }[]> {
  try {
    const rows = await db
      .select({ path: sql<string>`path` })
      .from(sql`binnacle_folders`)
      .where(sql`tenant_id = ${tenantId}`)
    return rows.map((r) => ({ name: r.path, count: 0 }))
  } catch {
    return []
  }
}

/** The app records attached to one file, for "Open in …" in a folder. */
export async function linksForAsset(tenantId: string, assetId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(assetId)) return [];
  return db
    .select({ appKey: assetAppLinks.appKey, recordId: assetAppLinks.recordId })
    .from(assetAppLinks)
    .where(and(eq(assetAppLinks.tenantId, tenantId), eq(assetAppLinks.assetId, assetId)));
}
