"use server"

import { db } from "@/lib/db"
import { inviteCodes, user } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
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

export async function useInviteCode(code: string) {
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
