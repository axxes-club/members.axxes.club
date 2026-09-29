export type DamAssetType = "image" | "video" | "document" | "other"
export type DamSort = "newest" | "oldest" | "name-asc" | "name-desc" | "largest" | "smallest"

export const DAM_UNFILED = "__unfiled__"

export interface DamAsset {
  id: string
  name: string
  description: string | null
  altText: string | null
  url: string
  thumbnailUrl: string | null
  mimeType: string | null
  size: number | null
  width: number | null
  height: number | null
  type: DamAssetType
  source: string | null
  originalFilename: string | null
  folder: string | null
  tags: string[]
  /**
   * Records in other AXXES apps that this asset is attached to.
   *
   * Folders holds the link and resolves it through a per-app URL registry, so it
   * never needs the app's schema. Most assets have none, which is why this is
   * empty rather than absent.
   */
  appLinks?: DamAppLink[]

  createdAt: string
  updatedAt: string
}

export interface DamAppLink {
  /** Catalog key of the owning app, e.g. "office". */
  appKey: string
  recordId: string
}

export interface DamQuery {
  q?: string
  type?: DamAssetType | null
  folder?: string | null
  sort?: DamSort
  offset?: number
}

export interface DamPage {
  assets: DamAsset[]
  total: number
  nextOffset: number | null
}

export interface DamFolder {
  name: string
  count: number
}

export interface DamOverview {
  folders: DamFolder[]
  counts: { all: number; image: number; video: number; document: number; unfiled: number }
}

export interface DamPermissions {
  role: string
  canWrite: boolean
  canDelete: boolean
}
