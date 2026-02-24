"use server"

import { db } from "@/lib/db"
import { inviteCodes, user, tenants, tenantMemberships, loginActivity } from "@/lib/db/schema"
import { eq, desc, count } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { auth } from "@/lib/auth"

async function requireSuperadmin() {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ")

  const session = await auth.api.getSession({
    headers: new Headers({ cookie: cookieHeader }),
  })

  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  })

  if (!dbUser?.isSuperadmin) {
    throw new Error("Forbidden: Superadmin access required")
  }

  return { userId: session.user.id, user: dbUser }
}

export async function getInviteCodes() {
  await requireSuperadmin()

  return db.query.inviteCodes.findMany({
    orderBy: [desc(inviteCodes.createdAt)],
  })
}

export async function createInviteCode(code: string, maxUses?: number) {
  const { userId } = await requireSuperadmin()

  if (!code || code.trim().length === 0) {
    throw new Error("Invite code is required")
  }

  const [newCode] = await db
    .insert(inviteCodes)
    .values({
      code: code.trim().toUpperCase(),
      maxUses: maxUses || null,
      createdById: userId,
    })
    .returning()

  revalidatePath("/admin")
  return newCode
}

export async function toggleInviteCode(id: string) {
  await requireSuperadmin()

  const existing = await db.query.inviteCodes.findFirst({
    where: eq(inviteCodes.id, id),
  })

  if (!existing) {
    throw new Error("Invite code not found")
  }

  const [updated] = await db
    .update(inviteCodes)
    .set({
      isActive: !existing.isActive,
      updatedAt: new Date(),
    })
    .where(eq(inviteCodes.id, id))
    .returning()

  revalidatePath("/admin")
  return updated
}

export async function deleteInviteCode(id: string) {
  await requireSuperadmin()

  await db.delete(inviteCodes).where(eq(inviteCodes.id, id))

  revalidatePath("/admin")
}

export async function validateInviteCode(code: string) {
  const inviteCode = await db.query.inviteCodes.findFirst({
    where: eq(inviteCodes.code, code.trim().toUpperCase()),
  })

  if (!inviteCode) {
    return { valid: false, error: "Invalid invite code" }
  }

  if (!inviteCode.isActive) {
    return { valid: false, error: "This invite code is no longer active" }
  }

  if (inviteCode.expiresAt && new Date() > inviteCode.expiresAt) {
    return { valid: false, error: "This invite code has expired" }
  }

  if (inviteCode.maxUses && inviteCode.usedCount >= inviteCode.maxUses) {
    return { valid: false, error: "This invite code has reached its usage limit" }
  }

  return { valid: true, inviteCode }
}

export async function consumeInviteCode(code: string) {
  const result = await validateInviteCode(code)

  if (!result.valid) {
    throw new Error(result.error)
  }

  await db
    .update(inviteCodes)
    .set({
      usedCount: (result.inviteCode!.usedCount || 0) + 1,
      updatedAt: new Date(),
    })
    .where(eq(inviteCodes.code, code.trim().toUpperCase()))

  return result.inviteCode
}

export async function getAllUsers() {
  await requireSuperadmin()

  return db.query.user.findMany({
    orderBy: [desc(user.createdAt)],
  })
}

export async function toggleUserSuperadmin(userId: string) {
  const { user: currentUser } = await requireSuperadmin()

  if (userId === currentUser.id) {
    throw new Error("Cannot modify your own superadmin status")
  }

  const targetUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
  })

  if (!targetUser) {
    throw new Error("User not found")
  }

  const [updated] = await db
    .update(user)
    .set({
      isSuperadmin: !targetUser.isSuperadmin,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId))
    .returning()

  revalidatePath("/admin")
  return updated
}

// Get admin dashboard stats
export async function getAdminStats() {
  await requireSuperadmin()

  const [userCount, tenantCount, recentLogins] = await Promise.all([
    db.select({ count: count() }).from(user),
    db.select({ count: count() }).from(tenants),
    db.select({ count: count() }).from(loginActivity),
  ])

  return {
    totalUsers: userCount[0]?.count || 0,
    totalBusinesses: tenantCount[0]?.count || 0,
    totalLogins: recentLogins[0]?.count || 0,
  }
}

// Get all tenants/businesses with owner info
export async function getAllTenants() {
  await requireSuperadmin()

  const allTenants = await db.query.tenants.findMany({
    orderBy: [desc(tenants.createdAt)],
  })

  // Get owner info and member counts for each tenant
  const tenantsWithDetails = await Promise.all(
    allTenants.map(async (tenant) => {
      const [owner, memberCount] = await Promise.all([
        db.query.user.findFirst({
          where: eq(user.id, tenant.ownerId),
        }),
        db.select({ count: count() })
          .from(tenantMemberships)
          .where(eq(tenantMemberships.tenantId, tenant.id)),
      ])

      return {
        ...tenant,
        owner: owner ? { id: owner.id, name: owner.name, email: owner.email, image: owner.image } : null,
        memberCount: memberCount[0]?.count || 0,
      }
    })
  )

  return tenantsWithDetails
}

// Get login activity
export async function getLoginActivity(limit: number = 50) {
  await requireSuperadmin()

  const activities = await db.query.loginActivity.findMany({
    orderBy: [desc(loginActivity.createdAt)],
    limit,
    with: {
      user: true,
      tenant: true,
    },
  })

  return activities.map((activity) => ({
    id: activity.id,
    eventType: activity.eventType,
    ipAddress: activity.ipAddress,
    userAgent: activity.userAgent,
    createdAt: activity.createdAt,
    user: activity.user ? {
      id: activity.user.id,
      name: activity.user.name,
      email: activity.user.email,
      image: activity.user.image,
    } : null,
    tenant: activity.tenant ? {
      id: activity.tenant.id,
      name: activity.tenant.name,
    } : null,
  }))
}

// Update tenant status (suspend, activate, etc.)
export async function updateTenantStatus(tenantId: string, status: "active" | "suspended" | "pending" | "cancelled") {
  await requireSuperadmin()

  const [updated] = await db
    .update(tenants)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId))
    .returning()

  if (!updated) {
    throw new Error("Tenant not found")
  }

  revalidatePath("/admin")
  return updated
}
