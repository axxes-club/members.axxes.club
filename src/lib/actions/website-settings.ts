"use server"

import { db } from "@/lib/db"
import { websiteSettings } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getAuthContext } from "@/lib/auth"

const websiteSettingsSchema = z.object({
  customDomain: z.string().optional().nullable(),
  subdomain: z.string().optional().nullable(),
  navigationStyle: z.enum(["horizontal", "hamburger", "none"]).optional(),
  footerStyle: z.enum(["minimal", "full", "none"]).optional(),
  googleAnalyticsId: z.string().optional().nullable(),
  facebookPixelId: z.string().optional().nullable(),
  defaultOgImage: z.string().optional().nullable(),
  footerText: z.string().optional().nullable(),
  showPoweredBy: z.string().optional(),
})

export type WebsiteSettingsFormData = z.infer<typeof websiteSettingsSchema>

async function getTenantId() {
  return getAuthContext()
}

export async function getWebsiteSettings() {
  const { tenantId } = await getTenantId()

  const settings = await db.query.websiteSettings.findFirst({
    where: eq(websiteSettings.tenantId, tenantId),
  })

  return settings
}

export async function upsertWebsiteSettings(data: Partial<WebsiteSettingsFormData>) {
  const { tenantId } = await getTenantId()

  const parsed = websiteSettingsSchema.partial().parse(data)

  // Check if settings exist
  const existing = await db.query.websiteSettings.findFirst({
    where: eq(websiteSettings.tenantId, tenantId),
  })

  if (existing) {
    // Update existing settings
    const [settings] = await db
      .update(websiteSettings)
      .set({
        ...parsed,
        updatedAt: new Date(),
      })
      .where(eq(websiteSettings.tenantId, tenantId))
      .returning()

    revalidatePath("/website/settings")
    return settings
  } else {
    // Create new settings
    const [settings] = await db
      .insert(websiteSettings)
      .values({
        tenantId,
        customDomain: parsed.customDomain || null,
        subdomain: parsed.subdomain || null,
        navigationStyle: parsed.navigationStyle || "horizontal",
        footerStyle: parsed.footerStyle || "minimal",
        googleAnalyticsId: parsed.googleAnalyticsId || null,
        facebookPixelId: parsed.facebookPixelId || null,
        defaultOgImage: parsed.defaultOgImage || null,
        footerText: parsed.footerText || null,
        showPoweredBy: parsed.showPoweredBy || "true",
      })
      .returning()

    revalidatePath("/website/settings")
    return settings
  }
}

export async function updateSubdomain(subdomain: string) {
  const { tenantId } = await getTenantId()

  // Validate subdomain format
  const subdomainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/
  if (!subdomainRegex.test(subdomain)) {
    throw new Error("Subdomain must be lowercase letters, numbers, and hyphens only, and cannot start or end with a hyphen")
  }

  if (subdomain.length < 3 || subdomain.length > 63) {
    throw new Error("Subdomain must be between 3 and 63 characters")
  }

  // Check if subdomain is already taken
  const existing = await db.query.websiteSettings.findFirst({
    where: eq(websiteSettings.subdomain, subdomain),
  })

  if (existing && existing.tenantId !== tenantId) {
    throw new Error("This subdomain is already taken")
  }

  return upsertWebsiteSettings({ subdomain })
}

export async function updateCustomDomain(customDomain: string | null) {
  if (customDomain) {
    // Basic domain validation
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i
    if (!domainRegex.test(customDomain)) {
      throw new Error("Invalid domain format")
    }
  }

  return upsertWebsiteSettings({ customDomain })
}

export async function updateAnalytics(data: {
  googleAnalyticsId?: string | null
  facebookPixelId?: string | null
}) {
  return upsertWebsiteSettings(data)
}

export async function updateNavigationStyle(style: "horizontal" | "hamburger" | "none") {
  return upsertWebsiteSettings({ navigationStyle: style })
}

export async function updateFooterStyle(style: "minimal" | "full" | "none") {
  return upsertWebsiteSettings({ footerStyle: style })
}

export async function updateFooterText(footerText: string | null) {
  return upsertWebsiteSettings({ footerText })
}

export async function togglePoweredBy(show: boolean) {
  return upsertWebsiteSettings({ showPoweredBy: show ? "true" : "false" })
}

export async function updateDefaultOgImage(ogImage: string | null) {
  return upsertWebsiteSettings({ defaultOgImage: ogImage })
}
