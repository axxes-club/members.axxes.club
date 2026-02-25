// @ts-nocheck
"use server"

import { db } from "@/lib/db"
import { tenants, tenantMemberships, tenantInvitations } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { nanoid } from "nanoid"
import { getAuthContext } from "@/lib/auth"

const tenantUpdateSchema = z.object({
  name: z.string().min(1, "Business name is required").optional(),
  slug: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  website: z.string().url().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
})

const invitationSchema = z.object({
  email: z.string().email("Valid email is required"),
  role: z.enum(["admin", "manager", "member", "viewer"]),
})

export type TenantUpdateData = z.infer<typeof tenantUpdateSchema>
export type InvitationData = z.infer<typeof invitationSchema>

async function getTenantId() {
  return getAuthContext()
}

export async function getTenant() {
  const { tenantId } = await getTenantId()

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  })

  if (!tenant) {
    throw new Error("Tenant not found")
  }

  return tenant
}

// Get a public tenant by slug (no auth required)
export async function getPublicTenantBySlug(slug: string) {
  const tenant = await db.query.tenants.findFirst({
    where: and(
      eq(tenants.slug, slug),
      eq(tenants.status, "active")
    ),
  })

  return tenant
}

export async function updateTenant(data: TenantUpdateData) {
  const { tenantId } = await getTenantId()

  const parsed = tenantUpdateSchema.parse(data)

  const [tenant] = await db
    .update(tenants)
    .set({
      ...parsed,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId))
    .returning()

  if (!tenant) {
    throw new Error("Tenant not found")
  }

  revalidatePath("/settings")
  return tenant
}

export async function getTeamMembers() {
  const { tenantId } = await getTenantId()

  const memberships = await db.query.tenantMemberships.findMany({
    where: and(
      eq(tenantMemberships.tenantId, tenantId),
      sql`${tenantMemberships.deletedAt} IS NULL`
    ),
    with: {
      user: true,
    },
  })

  const membersWithDetails = memberships.map((membership) => ({
    ...membership,
    name: membership.user?.name || "Unknown User",
    email: membership.user?.email || "",
    imageUrl: membership.user?.image || null,
  }))

  return membersWithDetails
}

export async function getInvitations() {
  const { tenantId } = await getTenantId()

  return db.query.tenantInvitations.findMany({
    where: and(
      eq(tenantInvitations.tenantId, tenantId),
      eq(tenantInvitations.status, "pending")
    ),
  })
}

export async function inviteTeamMember(data: InvitationData) {
  const { userId, tenantId } = await getTenantId()

  const parsed = invitationSchema.parse(data)

  // Check if there's already a pending invitation
  const existingInvitation = await db.query.tenantInvitations.findFirst({
    where: and(
      eq(tenantInvitations.tenantId, tenantId),
      eq(tenantInvitations.email, parsed.email),
      eq(tenantInvitations.status, "pending")
    ),
  })

  if (existingInvitation) {
    throw new Error("An invitation has already been sent to this email")
  }

  const token = nanoid(32)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

  const [invitation] = await db
    .insert(tenantInvitations)
    .values({
      tenantId,
      email: parsed.email,
      role: parsed.role,
      token,
      invitedById: userId,
      expiresAt,
    })
    .returning()

  revalidatePath("/settings")
  return invitation
}

export async function revokeInvitation(invitationId: string) {
  const { tenantId } = await getTenantId()

  const [invitation] = await db
    .update(tenantInvitations)
    .set({
      status: "revoked",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tenantInvitations.id, invitationId),
        eq(tenantInvitations.tenantId, tenantId)
      )
    )
    .returning()

  if (!invitation) {
    throw new Error("Invitation not found")
  }

  revalidatePath("/settings")
  return invitation
}

export async function updateMemberRole(membershipId: string, role: "admin" | "manager" | "member" | "viewer") {
  const { tenantId } = await getTenantId()

  // Can't change owner role
  const membership = await db.query.tenantMemberships.findFirst({
    where: and(
      eq(tenantMemberships.id, membershipId),
      eq(tenantMemberships.tenantId, tenantId)
    ),
  })

  if (!membership) {
    throw new Error("Member not found")
  }

  if (membership.role === "owner") {
    throw new Error("Cannot change the role of the owner")
  }

  const [updated] = await db
    .update(tenantMemberships)
    .set({
      role,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tenantMemberships.id, membershipId),
        eq(tenantMemberships.tenantId, tenantId)
      )
    )
    .returning()

  revalidatePath("/settings")
  return updated
}

export async function removeTeamMember(membershipId: string) {
  const { userId, tenantId } = await getTenantId()

  // Can't remove owner
  const membership = await db.query.tenantMemberships.findFirst({
    where: and(
      eq(tenantMemberships.id, membershipId),
      eq(tenantMemberships.tenantId, tenantId)
    ),
  })

  if (!membership) {
    throw new Error("Member not found")
  }

  if (membership.role === "owner") {
    throw new Error("Cannot remove the owner")
  }

  // Can't remove yourself (unless transferring ownership)
  if (membership.userId === userId) {
    throw new Error("Cannot remove yourself from the team")
  }

  await db
    .update(tenantMemberships)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tenantMemberships.id, membershipId),
        eq(tenantMemberships.tenantId, tenantId)
      )
    )

  revalidatePath("/settings")
}

// Get invitation by token (for acceptance page)
export async function getInvitationByToken(token: string) {
  const invitation = await db.query.tenantInvitations.findFirst({
    where: eq(tenantInvitations.token, token),
    with: {
      tenant: true,
      invitedBy: true,
    },
  })

  if (!invitation) {
    return null
  }

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt,
    tenantName: invitation.tenant?.name || "Unknown",
    invitedByName: invitation.invitedBy?.name || "Unknown",
  }
}

// Accept an invitation
export async function acceptInvitation(token: string) {
  const { cookies } = await import("next/headers")
  const { auth } = await import("@/lib/auth")

  // Get current user session
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ")

  const session = await auth.api.getSession({
    headers: new Headers({ cookie: cookieHeader }),
  })

  if (!session?.user) {
    throw new Error("You must be signed in to accept an invitation")
  }

  const invitation = await db.query.tenantInvitations.findFirst({
    where: eq(tenantInvitations.token, token),
  })

  if (!invitation) {
    throw new Error("Invitation not found")
  }

  if (invitation.status !== "pending") {
    throw new Error(`This invitation has already been ${invitation.status}`)
  }

  if (new Date(invitation.expiresAt) < new Date()) {
    // Update status to expired
    await db
      .update(tenantInvitations)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(tenantInvitations.id, invitation.id))
    throw new Error("This invitation has expired")
  }

  // Check if email matches
  if (invitation.email.toLowerCase() !== session.user.email?.toLowerCase()) {
    throw new Error("This invitation was sent to a different email address")
  }

  // Check if already a member
  const existingMembership = await db.query.tenantMemberships.findFirst({
    where: and(
      eq(tenantMemberships.tenantId, invitation.tenantId),
      eq(tenantMemberships.userId, session.user.id),
      sql`${tenantMemberships.deletedAt} IS NULL`
    ),
  })

  if (existingMembership) {
    // Update invitation status anyway
    await db
      .update(tenantInvitations)
      .set({
        status: "accepted",
        acceptedById: session.user.id,
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tenantInvitations.id, invitation.id))

    return { tenantId: invitation.tenantId, alreadyMember: true }
  }

  // Create membership
  await db.insert(tenantMemberships).values({
    tenantId: invitation.tenantId,
    userId: session.user.id,
    role: invitation.role,
  })

  // Update invitation status
  await db
    .update(tenantInvitations)
    .set({
      status: "accepted",
      acceptedById: session.user.id,
      acceptedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tenantInvitations.id, invitation.id))

  return { tenantId: invitation.tenantId, alreadyMember: false }
}
