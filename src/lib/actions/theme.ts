"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { themeSettings, type NewThemeSettings } from "@/lib/db/schema"
import { getAuthContext } from "@/lib/auth"
import { eq } from "drizzle-orm"

export async function getThemeSettings() {
  const { tenantId } = await getAuthContext()

  const settings = await db.query.themeSettings.findFirst({
    where: eq(themeSettings.tenantId, tenantId),
  })

  return settings
}

export async function upsertThemeSettings(data: Partial<NewThemeSettings>) {
  const { tenantId } = await getAuthContext()

  const existing = await db.query.themeSettings.findFirst({
    where: eq(themeSettings.tenantId, tenantId),
  })

  if (existing) {
    await db
      .update(themeSettings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(themeSettings.id, existing.id))
  } else {
    await db.insert(themeSettings).values({
      ...data,
      tenantId,
    })
  }

  revalidatePath("/settings/appearance")
  revalidatePath("/", "layout")
  return { success: true }
}

export async function updateThemeMode(mode: string) {
  return upsertThemeSettings({ mode })
}

export async function updateApplyBrandColors(applyBrandColors: boolean) {
  return upsertThemeSettings({ applyBrandColors })
}
