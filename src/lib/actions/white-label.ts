"use server"

import { revalidatePath } from "next/cache"
import { and, eq, sql } from "drizzle-orm"
import { nanoid } from "nanoid"
import { db } from "@/lib/db"
import { brandProfiles, tenantInvitations, tenants } from "@/lib/db/schema"
import { requireAxxesStaff } from "@/lib/white-label/access"
import {
  cleanLocalized,
  cleanText,
  readWhiteLabel,
  validHex,
  validUrl,
  validateSlug,
  type WhiteLabelSettings,
} from "@/lib/white-label/config"

const HANDSHAKE_URL = (process.env.HANDSHAKE_URL || "https://handshake.axxes.club").replace(/\/$/, "")
const MEMBERS_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://members.axxes.club").replace(/\/$/, "")

export type WhiteLabelCustomer = {
  tenantId: string
  name: string
  status: string
  whiteLabel: WhiteLabelSettings
  brand: {
    brandName: string | null
    tagline: string | null
    primaryColor: string | null
    accentColor: string | null
    logoUrl: string | null
    logoDarkUrl: string | null
    logoIconUrl: string | null
    faviconUrl: string | null
  }
  signInUrl: string
}

async function slugTaken(slug: string, exceptTenantId?: string) {
  const rows = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(sql`${tenants.settings}->'whiteLabel'->>'slug' = ${slug}`)
  return rows.some((r) => r.id !== exceptTenantId)
}

function toCustomer(t: typeof tenants.$inferSelect, b: typeof brandProfiles.$inferSelect | undefined): WhiteLabelCustomer | null {
  const whiteLabel = readWhiteLabel(t.settings)
  if (!whiteLabel) return null
  return {
    tenantId: t.id,
    name: t.name,
    status: t.status,
    whiteLabel,
    brand: {
      brandName: b?.brandName ?? t.name,
      tagline: b?.tagline ?? null,
      primaryColor: b?.primaryColor ?? t.primaryColor ?? null,
      accentColor: b?.accentColor ?? null,
      logoUrl: b?.logoUrl ?? t.logoUrl ?? null,
      logoDarkUrl: b?.logoDarkUrl ?? null,
      logoIconUrl: b?.logoIconUrl ?? null,
      faviconUrl: b?.faviconUrl ?? null,
    },
    signInUrl: `${HANDSHAKE_URL}/o/${whiteLabel.slug}`,
  }
}

/** Every white-label customer, for the admin list. */
export async function listWhiteLabelCustomers(): Promise<WhiteLabelCustomer[]> {
  await requireAxxesStaff()
  const rows = await db
    .select()
    .from(tenants)
    .leftJoin(brandProfiles, eq(brandProfiles.tenantId, tenants.id))
    .where(sql`${tenants.settings} ? 'whiteLabel' and ${tenants.deletedAt} is null`)
  return rows
    .map((r) => toCustomer(r.tenants, r.brand_profiles ?? undefined))
    .filter((c): c is WhiteLabelCustomer => c !== null)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getWhiteLabelCustomer(tenantId: string): Promise<WhiteLabelCustomer | null> {
  await requireAxxesStaff()
  const [row] = await db
    .select()
    .from(tenants)
    .leftJoin(brandProfiles, eq(brandProfiles.tenantId, tenants.id))
    .where(eq(tenants.id, tenantId))
  return row ? toCustomer(row.tenants, row.brand_profiles ?? undefined) : null
}

/** Organizations that exist but are not white-label yet, so staff can convert one. */
export async function listConvertibleOrganizations() {
  await requireAxxesStaff()
  return db
    .select({ id: tenants.id, name: tenants.name })
    .from(tenants)
    .where(sql`not (${tenants.settings} ? 'whiteLabel') and ${tenants.deletedAt} is null`)
    .orderBy(tenants.name)
}

type BrandInput = {
  brandName?: string
  tagline?: string
  primaryColor?: string
  accentColor?: string
  logoUrl?: string
  logoDarkUrl?: string
  logoIconUrl?: string
  faviconUrl?: string
}

function cleanBrand(input: BrandInput) {
  return {
    brandName: cleanText(input.brandName, 120),
    tagline: cleanText(input.tagline, 200) ?? null,
    primaryColor: validHex(input.primaryColor),
    accentColor: validHex(input.accentColor),
    logoUrl: validUrl(input.logoUrl),
    logoDarkUrl: validUrl(input.logoDarkUrl),
    logoIconUrl: validUrl(input.logoIconUrl),
    faviconUrl: validUrl(input.faviconUrl),
  }
}

async function upsertBrand(tenantId: string, fallbackName: string, input: BrandInput) {
  const brand = cleanBrand(input)
  const values = { ...brand, brandName: brand.brandName ?? fallbackName, updatedAt: new Date() }
  const existing = await db.query.brandProfiles.findFirst({ where: eq(brandProfiles.tenantId, tenantId) })
  if (existing) await db.update(brandProfiles).set(values).where(eq(brandProfiles.id, existing.id))
  else await db.insert(brandProfiles).values({ tenantId, ...values })
}

async function inviteAdmin(tenantId: string, email: string, invitedById: string) {
  const address = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new Error("Enter a valid email for the customer's admin.")
  const pending = await db.query.tenantInvitations.findFirst({
    where: and(
      eq(tenantInvitations.tenantId, tenantId),
      eq(tenantInvitations.email, address),
      eq(tenantInvitations.status, "pending")
    ),
  })
  const token = pending?.token ?? nanoid(32)
  if (!pending) {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 14)
    await db.insert(tenantInvitations).values({ tenantId, email: address, role: "admin", token, invitedById, expiresAt })
  }
  return `${MEMBERS_URL}/accept-invite?token=${token}`
}

export type ProvisionInput = BrandInput & {
  /** Convert this existing organization instead of creating one. */
  existingTenantId?: string
  name?: string
  slug: string
  adminEmail?: string
}

/**
 * Creates a white-label customer (or converts an existing organization):
 * the organization, its brand profile, its white-label settings, and an
 * invitation for its first admin. Returns the invite link to send them.
 */
export async function provisionWhiteLabelCustomer(input: ProvisionInput) {
  const staff = await requireAxxesStaff()
  const slug = input.slug.trim().toLowerCase()
  const slugError = validateSlug(slug)
  if (slugError) return { ok: false as const, error: slugError }
  if (await slugTaken(slug, input.existingTenantId)) return { ok: false as const, error: "Another customer already uses that address." }

  let tenantId = input.existingTenantId
  let name = cleanText(input.name, 120)
  const whiteLabel: WhiteLabelSettings = { enabled: true, slug, login: {} }

  if (tenantId) {
    const existing = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) })
    if (!existing) return { ok: false as const, error: "That organization no longer exists." }
    if (readWhiteLabel(existing.settings)) return { ok: false as const, error: "That organization is already white-label." }
    name = existing.name
    await db
      .update(tenants)
      .set({ settings: { ...(existing.settings ?? {}), whiteLabel }, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId))
  } else {
    if (!name) return { ok: false as const, error: "Give the customer a name." }
    const [created] = await db
      .insert(tenants)
      .values({
        name,
        // The tenant slug is internal and must be unique; the customer's address is whiteLabel.slug.
        slug: `${slug}-${nanoid(6).toLowerCase()}`,
        type: "business",
        status: "active",
        ownerId: staff.userId,
        primaryColor: validHex(input.primaryColor),
        logoUrl: validUrl(input.logoUrl),
        settings: { whiteLabel },
      })
      .returning({ id: tenants.id })
    tenantId = created.id
  }

  await upsertBrand(tenantId, name!, input)
  const inviteUrl = input.adminEmail ? await inviteAdmin(tenantId, input.adminEmail, staff.userId) : null

  revalidatePath("/admin/white-label")
  return { ok: true as const, tenantId, inviteUrl, signInUrl: `${HANDSHAKE_URL}/o/${slug}` }
}

export type UpdateInput = BrandInput & {
  enabled: boolean
  slug: string
  login: { headline?: { es?: string; en?: string }; tagline?: { es?: string; en?: string }; notice?: { es?: string; en?: string } }
}

/** Saves a customer's branding, sign-in wording, address and on/off switch. */
export async function updateWhiteLabelCustomer(tenantId: string, input: UpdateInput) {
  await requireAxxesStaff()
  const existing = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) })
  const current = existing ? readWhiteLabel(existing.settings) : null
  if (!existing || !current) return { ok: false as const, error: "That customer no longer exists." }

  const slug = input.slug.trim().toLowerCase()
  const slugError = validateSlug(slug)
  if (slugError) return { ok: false as const, error: slugError }
  if (await slugTaken(slug, tenantId)) return { ok: false as const, error: "Another customer already uses that address." }

  const whiteLabel: WhiteLabelSettings = {
    enabled: input.enabled === true,
    slug,
    login: {
      headline: cleanLocalized(input.login?.headline, 120),
      tagline: cleanLocalized(input.login?.tagline, 200),
      notice: cleanLocalized(input.login?.notice, 400),
    },
  }
  await db
    .update(tenants)
    .set({
      settings: { ...(existing.settings ?? {}), whiteLabel },
      // Kept in step for apps that still read the tenant columns (Krates' portal).
      primaryColor: validHex(input.primaryColor) ?? existing.primaryColor,
      logoUrl: validUrl(input.logoUrl) ?? existing.logoUrl,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId))
  await upsertBrand(tenantId, existing.name, input)

  revalidatePath("/admin/white-label")
  revalidatePath(`/admin/white-label/${tenantId}`)
  return { ok: true as const }
}

/** Another admin invitation for an existing customer. */
export async function inviteWhiteLabelAdmin(tenantId: string, email: string) {
  const staff = await requireAxxesStaff()
  try {
    return { ok: true as const, inviteUrl: await inviteAdmin(tenantId, email, staff.userId) }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not create the invitation." }
  }
}
