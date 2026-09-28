import { asc, desc, sql, type SQL } from "drizzle-orm"
import { assets, type Asset } from "@/lib/db/schema"
import type { DamAsset, DamAssetType, DamSort } from "./types"

export const DAM_TYPES: DamAssetType[] = ["image", "video", "document", "other"]
export const DAM_PAGE_SIZE = 60

const WRITE_ROLES = new Set(["owner", "admin", "manager", "member"])
const DELETE_ROLES = new Set(["owner", "admin", "manager"])

export function damPermissions(role: string) {
  return { role, canWrite: WRITE_ROLES.has(role), canDelete: DELETE_ROLES.has(role) }
}

export function damTypeOf(mimeType: string | null, category: string | null): DamAssetType {
  const mime = mimeType ?? ""
  if (mime.startsWith("image/") || category === "image") return "image"
  if (mime.startsWith("video/") || category === "video") return "video"
  if (mime.startsWith("application/") || mime.startsWith("text/") || category === "document") return "document"
  return "other"
}

// SQL mirror of damTypeOf so type filters and counts run in the database
const mime = sql`coalesce(${assets.mimeType}, '')`
const isImage = sql`(${mime} like 'image/%' or ${assets.category} = 'image')`
const isVideo = sql`(${mime} like 'video/%' or ${assets.category} = 'video')`
const isDocument = sql`(${mime} like 'application/%' or ${mime} like 'text/%' or ${assets.category} = 'document')`

export function damTypeCondition(type: DamAssetType): SQL {
  switch (type) {
    case "image":
      return isImage
    case "video":
      return sql`(${isVideo} and not ${isImage})`
    case "document":
      return sql`(${isDocument} and not ${isImage} and not ${isVideo})`
    case "other":
      return sql`(not ${isImage} and not ${isVideo} and not ${isDocument})`
  }
}

export function damOrderBy(sort: DamSort | undefined) {
  switch (sort) {
    case "oldest":
      return [asc(assets.createdAt), asc(assets.id)]
    case "name-asc":
      return [asc(sql`lower(${assets.name})`), asc(assets.id)]
    case "name-desc":
      return [desc(sql`lower(${assets.name})`), desc(assets.id)]
    case "largest":
      return [sql`${assets.fileSize} desc nulls last`, desc(assets.id)]
    case "smallest":
      return [sql`${assets.fileSize} asc nulls last`, asc(assets.id)]
    default:
      return [desc(assets.createdAt), desc(assets.id)]
  }
}

export function toDamAsset(row: Asset): DamAsset {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    altText: row.altText,
    url: row.url,
    thumbnailUrl: row.thumbnailUrl,
    mimeType: row.mimeType,
    size: row.fileSize,
    width: row.width,
    height: row.height,
    type: damTypeOf(row.mimeType, row.category),
    source: row.source,
    originalFilename: row.originalFilename,
    folder: row.folder,
    tags: Array.isArray(row.tags) ? row.tags.filter((t): t is string => typeof t === "string") : [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function normalizeFolder(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim().replace(/\s+/g, " ").slice(0, 120)
  return trimmed || null
}

export function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const tags = value
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim().toLowerCase().slice(0, 50))
    .filter(Boolean)
  return Array.from(new Set(tags)).slice(0, 50)
}

// UploadThing file URLs end in /f/<fileKey>
export function uploadthingKey(url: string): string | null {
  const match = url.match(/\/f\/([^/?#]+)/)
  return match ? decodeURIComponent(match[1]) : null
}
