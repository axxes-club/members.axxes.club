"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { assets, type NewAsset, type Asset } from "@/lib/db/schema"
import { getAuthContext } from "@/lib/auth"
import { eq, and, ilike, or, desc, sql } from "drizzle-orm"

export interface AssetFilters {
  search?: string
  category?: string
  folder?: string
  tags?: string[]
}

export async function getAssets(filters?: AssetFilters) {
  const { tenantId } = await getAuthContext()

  let query = db
    .select()
    .from(assets)
    .where(eq(assets.tenantId, tenantId))
    .orderBy(desc(assets.createdAt))

  // Note: Complex filtering with dynamic conditions would need query builder
  // For now, we fetch all and filter in memory for simplicity
  const allAssets = await query

  let filtered = allAssets

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase()
    filtered = filtered.filter(
      (a) =>
        a.name.toLowerCase().includes(searchLower) ||
        a.description?.toLowerCase().includes(searchLower) ||
        a.altText?.toLowerCase().includes(searchLower)
    )
  }

  if (filters?.category) {
    filtered = filtered.filter((a) => a.category === filters.category)
  }

  if (filters?.folder) {
    filtered = filtered.filter((a) => a.folder === filters.folder)
  }

  if (filters?.tags && filters.tags.length > 0) {
    filtered = filtered.filter((a) =>
      filters.tags!.some((tag) => (a.tags as string[] | null)?.includes(tag))
    )
  }

  return filtered
}

export async function getAsset(assetId: string) {
  const { tenantId } = await getAuthContext()

  const asset = await db.query.assets.findFirst({
    where: and(eq(assets.id, assetId), eq(assets.tenantId, tenantId)),
  })

  return asset
}

export async function createAsset(
  data: Omit<NewAsset, "id" | "tenantId" | "createdAt" | "updatedAt">
) {
  const { tenantId } = await getAuthContext()

  const [asset] = await db
    .insert(assets)
    .values({
      ...data,
      tenantId,
    })
    .returning()

  revalidatePath("/marketing/assets")
  return { success: true, asset }
}

export async function updateAsset(
  assetId: string,
  data: Partial<Omit<NewAsset, "id" | "tenantId" | "createdAt">>
) {
  const { tenantId } = await getAuthContext()

  await db
    .update(assets)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(assets.id, assetId), eq(assets.tenantId, tenantId)))

  revalidatePath("/marketing/assets")
  revalidatePath(`/marketing/assets/${assetId}`)
  return { success: true }
}

export async function deleteAsset(assetId: string) {
  const { tenantId } = await getAuthContext()

  await db
    .delete(assets)
    .where(and(eq(assets.id, assetId), eq(assets.tenantId, tenantId)))

  revalidatePath("/marketing/assets")
  return { success: true }
}

export async function incrementAssetUsage(assetId: string) {
  const { tenantId } = await getAuthContext()

  await db
    .update(assets)
    .set({
      usageCount: sql`${assets.usageCount} + 1`,
      lastUsedAt: new Date(),
    })
    .where(and(eq(assets.id, assetId), eq(assets.tenantId, tenantId)))

  return { success: true }
}

export async function getFolders() {
  const { tenantId } = await getAuthContext()

  const allAssets = await db
    .select({ folder: assets.folder })
    .from(assets)
    .where(eq(assets.tenantId, tenantId))

  // Get unique non-null folders
  const folders = [...new Set(allAssets.map((a) => a.folder).filter(Boolean))] as string[]
  return folders.sort()
}

export async function getAllTags() {
  const { tenantId } = await getAuthContext()

  const allAssets = await db
    .select({ tags: assets.tags })
    .from(assets)
    .where(eq(assets.tenantId, tenantId))

  // Flatten and get unique tags
  const tags = new Set<string>()
  allAssets.forEach((a) => {
    const assetTags = a.tags as string[] | null
    assetTags?.forEach((tag) => tags.add(tag))
  })

  return [...tags].sort()
}

// Utility to fetch URL metadata (dimensions, mime type)
export async function fetchUrlMetadata(url: string) {
  try {
    const response = await fetch(url, { method: "HEAD" })
    const contentType = response.headers.get("content-type")
    const contentLength = response.headers.get("content-length")

    let category: string | undefined
    if (contentType?.startsWith("image/")) category = "image"
    else if (contentType?.startsWith("video/")) category = "video"
    else if (contentType?.startsWith("audio/")) category = "audio"
    else if (
      contentType?.includes("pdf") ||
      contentType?.includes("document") ||
      contentType?.includes("text")
    )
      category = "document"

    return {
      mimeType: contentType || undefined,
      fileSize: contentLength ? parseInt(contentLength) : undefined,
      category,
    }
  } catch (error) {
    console.error("Failed to fetch URL metadata:", error)
    return {}
  }
}
