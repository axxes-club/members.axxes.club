"use server"

import { headers } from "next/headers"
import { and, eq, inArray, sql } from "drizzle-orm"
import { UTApi } from "uploadthing/server"
import { db } from "@/lib/db"
import { assets } from "@/lib/db/schema"
import { requireTenantAccess } from "@/lib/auth/tenant-context"
import {
  damPermissions,
  damTypeOf,
  normalizeFolder,
  normalizeTags,
  toDamAsset,
  uploadthingKey,
} from "@/lib/dam/assets"
import { createShareToken } from "@/lib/dam/share"
import type { DamAsset } from "@/lib/dam/types"

const MAX_BULK = 500

async function access(need: "read" | "write" | "delete" = "read") {
  const { tenantId, userId, role } = await requireTenantAccess()
  const perms = damPermissions(role)
  if (need === "write" && !perms.canWrite) throw new Error("You don't have permission to edit assets")
  if (need === "delete" && !perms.canDelete) throw new Error("You don't have permission to delete assets")
  return { tenantId, userId, ...perms }
}

function cleanIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return []
  const uuid = /^[0-9a-f-]{36}$/i
  return Array.from(new Set(ids.filter((id): id is string => typeof id === "string" && uuid.test(id)))).slice(0, MAX_BULK)
}

// ── Single-asset edits ───────────────────────────────────────────────────

export async function updateDamAsset(
  id: string,
  patch: { name?: string; folder?: string | null; tags?: string[]; description?: string | null; altText?: string | null }
): Promise<DamAsset> {
  const { tenantId } = await access("write")

  const updates: Partial<typeof assets.$inferInsert> = {}
  if (patch.name !== undefined) {
    const name = patch.name.trim().slice(0, 255)
    if (!name) throw new Error("Name is required")
    updates.name = name
  }
  if (patch.folder !== undefined) updates.folder = normalizeFolder(patch.folder)
  if (patch.tags !== undefined) updates.tags = normalizeTags(patch.tags)
  if (patch.description !== undefined) updates.description = patch.description?.trim().slice(0, 2000) || null
  if (patch.altText !== undefined) updates.altText = patch.altText?.trim().slice(0, 500) || null

  const [row] = await db
    .update(assets)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(assets.id, id), eq(assets.tenantId, tenantId)))
    .returning()
  if (!row) throw new Error("Asset not found")
  return toDamAsset(row)
}

export async function duplicateDamAsset(id: string): Promise<DamAsset> {
  const { tenantId } = await access("write")
  const [original] = await db.select().from(assets).where(and(eq(assets.id, id), eq(assets.tenantId, tenantId)))
  if (!original) throw new Error("Asset not found")

  const { id: _id, createdAt: _c, updatedAt: _u, usageCount: _uc, lastUsedAt: _l, ...copy } = original
  const [row] = await db
    .insert(assets)
    .values({ ...copy, name: `${original.name} (copy)`.slice(0, 255) })
    .returning()
  return toDamAsset(row)
}

export async function createDamAssetFromUrl(input: { url: string; name?: string; folder?: string | null }): Promise<DamAsset> {
  const { tenantId } = await access("write")

  let url: URL
  try {
    url = new URL(input.url.trim())
  } catch {
    throw new Error("Enter a valid URL")
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Only http(s) links are supported")

  // Best effort: learn the type and size from the remote server
  let mimeType: string | null = null
  let fileSize: number | null = null
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(5000) })
    mimeType = res.headers.get("content-type")?.split(";")[0].trim() || null
    const length = Number(res.headers.get("content-length"))
    fileSize = Number.isFinite(length) && length > 0 && length < 2 ** 31 ? length : null
  } catch {}
  if (!mimeType || mimeType === "application/octet-stream") mimeType = guessMime(url.pathname) ?? mimeType

  const filename = decodeURIComponent(url.pathname.split("/").pop() || "") || url.hostname
  const name = (input.name?.trim() || filename.replace(/\.[^.]+$/, "") || filename).slice(0, 255)

  const [row] = await db
    .insert(assets)
    .values({
      tenantId,
      name,
      url: url.toString(),
      mimeType,
      fileSize,
      folder: normalizeFolder(input.folder),
      category: damTypeOf(mimeType, null),
      source: "url",
      originalFilename: filename.slice(0, 255),
      tags: [],
    })
    .returning()
  return toDamAsset(row)
}

function guessMime(pathname: string): string | null {
  const ext = pathname.split(".").pop()?.toLowerCase()
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp",
    svg: "image/svg+xml", avif: "image/avif", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm",
    pdf: "application/pdf", doc: "application/msword", zip: "application/zip", txt: "text/plain",
  }
  return ext ? map[ext] ?? null : null
}

// ── Bulk operations ──────────────────────────────────────────────────────

export async function moveDamAssets(ids: string[], folder: string | null): Promise<number> {
  const { tenantId } = await access("write")
  const clean = cleanIds(ids)
  if (!clean.length) return 0
  const moved = await db
    .update(assets)
    .set({ folder: normalizeFolder(folder), updatedAt: new Date() })
    .where(and(eq(assets.tenantId, tenantId), inArray(assets.id, clean)))
    .returning({ id: assets.id })
  return moved.length
}

export async function addDamTags(ids: string[], tags: string[]): Promise<number> {
  const { tenantId } = await access("write")
  const clean = cleanIds(ids)
  const newTags = normalizeTags(tags)
  if (!clean.length || !newTags.length) return 0

  const rows = await db
    .select({ id: assets.id, tags: assets.tags })
    .from(assets)
    .where(and(eq(assets.tenantId, tenantId), inArray(assets.id, clean)))
  await Promise.all(
    rows.map((row) =>
      db
        .update(assets)
        .set({ tags: normalizeTags([...(row.tags ?? []), ...newTags]), updatedAt: new Date() })
        .where(eq(assets.id, row.id))
    )
  )
  return rows.length
}

export async function deleteDamAssets(ids: string[]): Promise<number> {
  const { tenantId } = await access("delete")
  const clean = cleanIds(ids)
  if (!clean.length) return 0

  const deleted = await db
    .delete(assets)
    .where(and(eq(assets.tenantId, tenantId), inArray(assets.id, clean)))
    .returning({ url: assets.url, source: assets.source })

  await removeOrphanedUploads(deleted)
  return deleted.length
}

// Files we uploaded ourselves are removed from storage once no asset (e.g. a duplicate) still points at them.
async function removeOrphanedUploads(rows: { url: string; source: string | null }[]) {
  const urls = Array.from(new Set(rows.filter((r) => r.source === "upload").map((r) => r.url)))
  if (!urls.length || !process.env.UPLOADTHING_TOKEN) return

  const stillUsed = await db.select({ url: assets.url }).from(assets).where(inArray(assets.url, urls))
  const used = new Set(stillUsed.map((r) => r.url))
  const keys = urls.filter((u) => !used.has(u)).map(uploadthingKey).filter((k): k is string => !!k)
  if (!keys.length) return

  await new UTApi().deleteFiles(keys).catch((err) => {
    console.error("Failed to delete UploadThing files", keys, err)
  })
}

// ── Folders ──────────────────────────────────────────────────────────────

export async function renameDamFolder(from: string, to: string): Promise<number> {
  const { tenantId } = await access("write")
  const target = normalizeFolder(to)
  if (!target) throw new Error("Folder name is required")
  const moved = await db
    .update(assets)
    .set({ folder: target, updatedAt: new Date() })
    .where(and(eq(assets.tenantId, tenantId), eq(assets.folder, from)))
    .returning({ id: assets.id })
  return moved.length
}

export async function deleteDamFolder(name: string, deleteContents: boolean): Promise<number> {
  if (deleteContents) {
    const { tenantId } = await access("delete")
    const deleted = await db
      .delete(assets)
      .where(and(eq(assets.tenantId, tenantId), eq(assets.folder, name)))
      .returning({ url: assets.url, source: assets.source })
    await removeOrphanedUploads(deleted)
    return deleted.length
  }

  const { tenantId } = await access("write")
  const moved = await db
    .update(assets)
    .set({ folder: null, updatedAt: new Date() })
    .where(and(eq(assets.tenantId, tenantId), eq(assets.folder, name)))
    .returning({ id: assets.id })
  return moved.length
}

// ── Sharing ──────────────────────────────────────────────────────────────

const SHARE_DAYS = new Set([1, 7, 30, 365])

export async function createDamShareLink(
  target: { kind: "asset"; id: string } | { kind: "folder"; folder: string },
  days: number
): Promise<{ url: string; expiresAt: string }> {
  const { tenantId } = await access("write")
  if (!SHARE_DAYS.has(days)) throw new Error("Invalid expiry")
  const exp = Date.now() + days * 24 * 60 * 60 * 1000

  let token: string
  if (target.kind === "asset") {
    const [row] = await db
      .select({ id: assets.id })
      .from(assets)
      .where(and(eq(assets.id, target.id), eq(assets.tenantId, tenantId)))
    if (!row) throw new Error("Asset not found")
    token = createShareToken({ k: "asset", t: tenantId, id: row.id, exp })
  } else {
    const folder = normalizeFolder(target.folder)
    if (!folder) throw new Error("Folder is required")
    token = createShareToken({ k: "folder", t: tenantId, f: folder, exp })
  }

  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? "https"
  return { url: `${proto}://${host}/share/${token}`, expiresAt: new Date(exp).toISOString() }
}

// Tag suggestions for the current workspace
export async function listDamTags(): Promise<string[]> {
  const { tenantId } = await access()
  const rows = await db.execute<{ tag: string }>(sql`
    select distinct jsonb_array_elements_text(${assets.tags}) as tag
    from ${assets}
    where ${assets.tenantId} = ${tenantId} and jsonb_typeof(${assets.tags}) = 'array'
    order by tag
    limit 200
  `)
  return rows.rows.map((r) => r.tag)
}
