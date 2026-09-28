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
  createdAt: string
  updatedAt: string
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
