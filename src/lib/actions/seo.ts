"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { seoSettings, seoMetadata, type NewSeoSettings, type NewSeoMetadata } from "@/lib/db/schema"
import { getAuthContext } from "@/lib/auth"
import { eq, and } from "drizzle-orm"

// ============ SEO SETTINGS ============

export async function getSeoSettings() {
  const { tenantId } = await getAuthContext()

  const settings = await db.query.seoSettings.findFirst({
    where: eq(seoSettings.tenantId, tenantId),
  })

  return settings
}

export async function upsertSeoSettings(data: Partial<NewSeoSettings>) {
  const { tenantId } = await getAuthContext()

  const existing = await db.query.seoSettings.findFirst({
    where: eq(seoSettings.tenantId, tenantId),
  })

  if (existing) {
    await db
      .update(seoSettings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(seoSettings.id, existing.id))
  } else {
    await db.insert(seoSettings).values({
      ...data,
      tenantId,
    })
  }

  revalidatePath("/marketing/seo")
  return { success: true }
}

export async function updateSeoGlobalSettings(data: {
  siteName?: string
  siteDescription?: string
  defaultOgImage?: string
  twitterHandle?: string
}) {
  return upsertSeoSettings(data)
}

export async function updateRobotsTxt(data: {
  robotsTxt?: string
  allowIndexing?: boolean
}) {
  return upsertSeoSettings(data)
}

export async function updateSitemapSettings(data: {
  sitemapEnabled?: boolean
  sitemapExclusions?: string[]
}) {
  return upsertSeoSettings(data)
}

export async function updateOrganizationSchema(data: {
  organizationSchema?: {
    "@type": string
    name: string
    logo?: string
    url?: string
    sameAs?: string[]
    contactPoint?: { "@type": string; telephone: string; contactType: string }
  }
}) {
  return upsertSeoSettings(data)
}

// ============ PER-ENTITY SEO METADATA ============

export async function getEntitySeo(entityType: string, entityId: string) {
  const { tenantId } = await getAuthContext()

  const metadata = await db.query.seoMetadata.findFirst({
    where: and(
      eq(seoMetadata.tenantId, tenantId),
      eq(seoMetadata.entityType, entityType),
      eq(seoMetadata.entityId, entityId)
    ),
  })

  return metadata
}

export async function upsertEntitySeo(
  entityType: string,
  entityId: string,
  data: Partial<Omit<NewSeoMetadata, "tenantId" | "entityType" | "entityId">>
) {
  const { tenantId } = await getAuthContext()

  const existing = await db.query.seoMetadata.findFirst({
    where: and(
      eq(seoMetadata.tenantId, tenantId),
      eq(seoMetadata.entityType, entityType),
      eq(seoMetadata.entityId, entityId)
    ),
  })

  if (existing) {
    await db
      .update(seoMetadata)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(seoMetadata.id, existing.id))
  } else {
    await db.insert(seoMetadata).values({
      ...data,
      tenantId,
      entityType,
      entityId,
    })
  }

  revalidatePath(`/marketing/seo/${entityType}/${entityId}`)
  return { success: true }
}

export async function deleteEntitySeo(entityType: string, entityId: string) {
  const { tenantId } = await getAuthContext()

  await db
    .delete(seoMetadata)
    .where(
      and(
        eq(seoMetadata.tenantId, tenantId),
        eq(seoMetadata.entityType, entityType),
        eq(seoMetadata.entityId, entityId)
      )
    )

  revalidatePath(`/marketing/seo/${entityType}/${entityId}`)
  return { success: true }
}
