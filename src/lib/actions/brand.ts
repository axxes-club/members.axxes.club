"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { brandProfiles, type NewBrandProfile } from "@/lib/db/schema"
import { getAuthContext } from "@/lib/auth"
import { eq, and } from "drizzle-orm"

export async function getBrandProfile() {
  const { tenantId } = await getAuthContext()

  const profile = await db.query.brandProfiles.findFirst({
    where: eq(brandProfiles.tenantId, tenantId),
  })

  return profile
}

export async function upsertBrandProfile(data: Partial<NewBrandProfile>) {
  const { tenantId } = await getAuthContext()

  const existing = await db.query.brandProfiles.findFirst({
    where: eq(brandProfiles.tenantId, tenantId),
  })

  if (existing) {
    await db
      .update(brandProfiles)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(brandProfiles.id, existing.id))
  } else {
    await db.insert(brandProfiles).values({
      ...data,
      tenantId,
      brandName: data.brandName || "My Brand",
    })
  }

  revalidatePath("/settings/brand")
  return { success: true }
}

export async function updateBrandBasicInfo(data: {
  brandName: string
  tagline?: string
  description?: string
  shortDescription?: string
}) {
  return upsertBrandProfile(data)
}

export async function updateBrandColors(data: {
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  backgroundColor?: string
  backgroundColorDark?: string
  textColor?: string
  textColorDark?: string
  colorPalette?: { colors: Array<{ name: string; hex: string; usage?: string }> }
}) {
  return upsertBrandProfile(data)
}

export async function updateBrandLogos(data: {
  logoUrl?: string
  logoLightUrl?: string
  logoDarkUrl?: string
  logoIconUrl?: string
  logoHorizontalUrl?: string
  logoVerticalUrl?: string
  faviconUrl?: string
}) {
  return upsertBrandProfile(data)
}

export async function updateBrandTypography(data: {
  headingFont?: string
  bodyFont?: string
  accentFont?: string
  fontUrls?: { fonts: Array<{ name: string; url: string; weights?: string[] }> }
}) {
  return upsertBrandProfile(data)
}

export async function updateBrandDesignRules(data: {
  designRules?: {
    logoMinSize?: string
    logoClearSpace?: string
    cornerRadius?: string
    buttonStyle?: "filled" | "outline" | "ghost"
    imageStyle?: "sharp" | "rounded" | "circular"
    shadowStyle?: "none" | "subtle" | "medium" | "dramatic"
    gradientDirection?: string
    doList?: string[]
    dontList?: string[]
    notes?: string
  }
}) {
  return upsertBrandProfile(data)
}

export async function updateBrandContact(data: {
  website?: string
  email?: string
  phone?: string
  socialLinks?: Record<string, string>
  copyrightText?: string
  legalName?: string
}) {
  return upsertBrandProfile(data)
}

export async function updateBrandTicketDefaults(data: {
  ticketDefaults?: {
    showLogo?: boolean
    showQrCode?: boolean
    showBarcode?: boolean
    ticketSize?: "standard" | "compact" | "large"
    orientation?: "portrait" | "landscape"
    backgroundImage?: string
    footerText?: string
    termsUrl?: string
  }
}) {
  return upsertBrandProfile(data)
}

export async function updateBrandVoiceTone(data: {
  voiceTone?: {
    personality?: string[]
    writingStyle?: string
    keywords?: string[]
    avoidWords?: string[]
    samplePhrases?: string[]
  }
}) {
  return upsertBrandProfile(data)
}
