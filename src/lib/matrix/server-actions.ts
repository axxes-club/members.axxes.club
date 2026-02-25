// @ts-nocheck
"use server"

import { db } from "@/lib/db"
import { matrixAccounts, matrixSpaces, matrixRooms, matrixRoomMembers, tenants, tenantMemberships, user } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { nanoid } from "nanoid"
import { auth } from "@/lib/auth"
import { cookies } from "next/headers"
import * as crypto from "crypto"

// Matrix client imports (for server-side)
import * as Matrix from "matrix-js-sdk"

const HOMESERVER_URL = "https://matrix.org"

// Encryption key for access tokens (should be in env)
const ENCRYPTION_KEY = process.env.MATRIX_ENCRYPTION_KEY || "default-key-change-in-production-32ch"

// Encrypt access token before storing
function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16)
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32)
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv)
  let encrypted = cipher.update(token, "utf8", "hex")
  encrypted += cipher.final("hex")
  return iv.toString("hex") + ":" + encrypted
}

// Decrypt access token
function decryptToken(encrypted: string): string {
  const [ivHex, encryptedData] = encrypted.split(":")
  const iv = Buffer.from(ivHex, "hex")
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32)
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv)
  let decrypted = decipher.update(encryptedData, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}

// Generate a unique Matrix username from user ID
function generateMatrixUsername(userId: string): string {
  // Matrix usernames can only contain a-z, 0-9, =, _, -, .
  // We'll use a shortened user ID with prefix
  const shortId = userId.replace(/[^a-z0-9]/gi, "").slice(0, 20).toLowerCase()
  return `axxes_${shortId}_${nanoid(8)}`
}

// Generate a secure random password
function generateMatrixPassword(): string {
  return nanoid(32) + "!A1" // Ensure meets complexity requirements
}

/**
 * Get or create a Matrix account for the current user
 */
export async function getOrCreateMatrixAccount(): Promise<{
  success: boolean
  matrixUserId?: string
  accessToken?: string
  deviceId?: string
  error?: string
}> {
  try {
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
      return { success: false, error: "Not authenticated" }
    }

    const userId = session.user.id

    // Check if user already has a Matrix account
    const existing = await db.query.matrixAccounts.findFirst({
      where: eq(matrixAccounts.userId, userId),
    })

    if (existing && existing.isActive) {
      // Return existing credentials
      return {
        success: true,
        matrixUserId: existing.matrixUserId,
        accessToken: decryptToken(existing.accessToken),
        deviceId: existing.deviceId || undefined,
      }
    }

    // Create new Matrix account
    const username = generateMatrixUsername(userId)
    const password = generateMatrixPassword()

    // Register with Matrix
    const matrixClient = Matrix.createClient({ baseUrl: HOMESERVER_URL })
    
    let registerResponse
    try {
      registerResponse = await matrixClient.register(username, password, null, {
        type: "m.login.dummy",
      })
    } catch (error: unknown) {
      const matrixError = error as { errcode?: string }
      // If user exists, try to login
      if (matrixError.errcode === "M_USER_IN_USE") {
        // This shouldn't happen with our unique username generation
        // But handle it gracefully
        const loginResponse = await matrixClient.loginWithPassword(username, password)
        registerResponse = loginResponse
      } else {
        throw error
      }
    }

    const { user_id, access_token, device_id } = registerResponse

    // Store in database
    await db.insert(matrixAccounts).values({
      userId,
      matrixUserId: user_id,
      homeserver: "matrix.org",
      accessToken: encryptToken(access_token || ""),
      deviceId: device_id,
      isActive: true,
    })

    return {
      success: true,
      matrixUserId: user_id,
      accessToken: access_token,
      deviceId: device_id,
    }
  } catch (error) {
    console.error("Failed to create Matrix account:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create Matrix account",
    }
  }
}

/**
 * Get Matrix account for a specific user (server-side)
 */
export async function getMatrixAccount(userId: string): Promise<{
  matrixUserId: string
  accessToken: string
  deviceId: string | null
} | null> {
  const account = await db.query.matrixAccounts.findFirst({
    where: eq(matrixAccounts.userId, userId),
  })

  if (!account || !account.isActive) {
    return null
  }

  return {
    matrixUserId: account.matrixUserId,
    accessToken: decryptToken(account.accessToken),
    deviceId: account.deviceId,
  }
}

/**
 * Create a Matrix Space for a tenant (workspace)
 */
export async function createTenantSpace(tenantId: string): Promise<{
  success: boolean
  spaceId?: string
  roomId?: string
  error?: string
}> {
  try {
    // Get tenant info
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    })

    if (!tenant) {
      return { success: false, error: "Tenant not found" }
    }

    // Check if space already exists
    const existingSpace = await db.query.matrixSpaces.findFirst({
      where: eq(matrixSpaces.tenantId, tenantId),
    })

    if (existingSpace) {
      return {
        success: true,
        spaceId: existingSpace.id,
        roomId: existingSpace.roomId,
      }
    }

    // Get the owner's Matrix account
    const ownerAccount = await getMatrixAccount(tenant.ownerId)
    if (!ownerAccount) {
      return { success: false, error: "Owner does not have a Matrix account" }
    }

    // Create Matrix client with owner's credentials
    const matrixClient = Matrix.createClient({
      baseUrl: HOMESERVER_URL,
      accessToken: ownerAccount.accessToken,
      userId: ownerAccount.matrixUserId,
    })

    // Create the Space
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (matrixClient as any).createRoom({
      name: tenant.name,
      topic: `Workspace for ${tenant.name}`,
      preset: "private_chat",
      visibility: "private",
      creation_content: {
        type: "m.space",
      },
      initial_state: [
        {
          type: "m.room.history_visibility",
          state_key: "",
          content: { history_visibility: "shared" },
        },
      ],
    })

    const roomId = response.room_id

    // Store in database
    const [space] = await db.insert(matrixSpaces).values({
      tenantId,
      roomId,
      isEncrypted: false,
    }).returning()

    return {
      success: true,
      spaceId: space.id,
      roomId,
    }
  } catch (error) {
    console.error("Failed to create tenant space:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create space",
    }
  }
}

/**
 * Create a room within a tenant's space
 */
export async function createTenantRoom(
  tenantId: string,
  options: {
    name: string
    topic?: string
    type: "channel" | "dm"
    isPublic?: boolean
    memberUserIds?: string[]
  }
): Promise<{
  success: boolean
  roomId?: string
  matrixRoomId?: string
  error?: string
}> {
  try {
    // Get tenant's space
    const space = await db.query.matrixSpaces.findFirst({
      where: eq(matrixSpaces.tenantId, tenantId),
    })

    if (!space) {
      return { success: false, error: "Tenant space not found. Create space first." }
    }

    // Get current user's Matrix account
    const cookieStore = await cookies()
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ")

    const session = await auth.api.getSession({
      headers: new Headers({ cookie: cookieHeader }),
    })

    if (!session?.user) {
      return { success: false, error: "Not authenticated" }
    }

    const userAccount = await getMatrixAccount(session.user.id)
    if (!userAccount) {
      return { success: false, error: "User does not have a Matrix account" }
    }

    // Create Matrix client
    const matrixClient = Matrix.createClient({
      baseUrl: HOMESERVER_URL,
      accessToken: userAccount.accessToken,
      userId: userAccount.matrixUserId,
    })

    // Get Matrix user IDs for invited members
    const inviteMatrixIds: string[] = []
    if (options.memberUserIds?.length) {
      for (const uid of options.memberUserIds) {
        const memberAccount = await getMatrixAccount(uid)
        if (memberAccount) {
          inviteMatrixIds.push(memberAccount.matrixUserId)
        }
      }
    }

    // Create the room
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (matrixClient as any).createRoom({
      name: options.name,
      topic: options.topic,
      preset: options.isPublic ? "public_chat" : "private_chat",
      visibility: options.isPublic ? "public" : "private",
      invite: inviteMatrixIds.length > 0 ? inviteMatrixIds : undefined,
      initial_state: [
        {
          type: "m.room.history_visibility",
          state_key: "",
          content: { history_visibility: "shared" },
        },
      ],
    })

    const matrixRoomId = response.room_id

    // Add room to space
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (matrixClient as any).sendStateEvent(space.roomId, "m.space.child", {
      via: ["matrix.org"],
      suggested: false,
    }, matrixRoomId)

    // Store in database
    const [room] = await db.insert(matrixRooms).values({
      tenantId,
      spaceId: space.id,
      roomId: matrixRoomId,
      type: options.type,
      name: options.name,
      topic: options.topic || null,
      isEncrypted: false,
      isPublic: options.isPublic || false,
    }).returning()

    // Add current user as member
    await db.insert(matrixRoomMembers).values({
      roomId: room.id,
      matrixAccountId: (await db.query.matrixAccounts.findFirst({
        where: eq(matrixAccounts.userId, session.user.id),
      }))!.id,
      membership: "join",
    })

    return {
      success: true,
      roomId: room.id,
      matrixRoomId,
    }
  } catch (error) {
    console.error("Failed to create room:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create room",
    }
  }
}

/**
 * Add a tenant member to the Matrix Space
 */
export async function addMemberToTenantSpace(
  tenantId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get tenant's space
    const space = await db.query.matrixSpaces.findFirst({
      where: eq(matrixSpaces.tenantId, tenantId),
    })

    if (!space) {
      return { success: false, error: "Tenant space not found" }
    }

    // Get tenant owner's Matrix account (for inviting)
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    })

    if (!tenant) {
      return { success: false, error: "Tenant not found" }
    }

    const ownerAccount = await getMatrixAccount(tenant.ownerId)
    const memberAccount = await getMatrixAccount(userId)

    if (!ownerAccount || !memberAccount) {
      return { success: false, error: "Matrix accounts not found" }
    }

    // Create Matrix client as owner
    const matrixClient = Matrix.createClient({
      baseUrl: HOMESERVER_URL,
      accessToken: ownerAccount.accessToken,
      userId: ownerAccount.matrixUserId,
    })

    // Invite member to the space
    await matrixClient.invite(space.roomId, memberAccount.matrixUserId)

    // Get all tenant rooms and invite to each
    const rooms = await db.query.matrixRooms.findMany({
      where: eq(matrixRooms.tenantId, tenantId),
    })

    for (const room of rooms) {
      try {
        await matrixClient.invite(room.roomId, memberAccount.matrixUserId)
      } catch {
        // Ignore if already invited
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to add member to space:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add member",
    }
  }
}

/**
 * Get all rooms for a tenant
 */
export async function getTenantRooms(tenantId: string): Promise<{
  rooms: typeof matrixRooms.$inferSelect[]
}> {
  const rooms = await db.query.matrixRooms.findMany({
    where: eq(matrixRooms.tenantId, tenantId),
    with: {
      members: {
        with: {
          matrixAccount: {
            with: {
              user: true,
            },
          },
        },
      },
    },
  })

  return { rooms }
}

/**
 * Get user's rooms across all tenants they're a member of
 */
export async function getUserRooms(): Promise<{
  rooms: Array<typeof matrixRooms.$inferSelect & {
    tenant: { id: string; name: string; slug: string }
  }>
}> {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ")

  const session = await auth.api.getSession({
    headers: new Headers({ cookie: cookieHeader }),
  })

  if (!session?.user) {
    return { rooms: [] }
  }

  // Get user's Matrix account
  const matrixAccount = await db.query.matrixAccounts.findFirst({
    where: eq(matrixAccounts.userId, session.user.id),
  })

  if (!matrixAccount) {
    return { rooms: [] }
  }

  // Get user's room memberships
  const memberships = await db.query.matrixRoomMembers.findMany({
    where: eq(matrixRoomMembers.matrixAccountId, matrixAccount.id),
    with: {
      room: {
        with: {
          tenant: {
            columns: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  })

  return {
    rooms: memberships.map((m) => ({
      ...m.room,
      tenant: m.room.tenant,
    })),
  }
}

/**
 * Provision Matrix accounts for all tenant members who don't have one
 */
export async function provisionTenantMatrixAccounts(tenantId: string): Promise<{
  success: boolean
  created: number
  errors: string[]
}> {
  const errors: string[] = []
  let created = 0

  try {
    // Get all tenant members
    const members = await db.query.tenantMemberships.findMany({
      where: eq(tenantMemberships.tenantId, tenantId),
      with: {
        user: true,
      },
    })

    for (const member of members) {
      // Check if already has Matrix account
      const existing = await db.query.matrixAccounts.findFirst({
        where: eq(matrixAccounts.userId, member.userId),
      })

      if (existing) continue

      // Create Matrix account
      const result = await getOrCreateMatrixAccount()
      
      if (result.success) {
        created++
      } else {
        errors.push(`Failed to create account for ${member.user.name}: ${result.error}`)
      }
    }

    return { success: true, created, errors }
  } catch (error) {
    return {
      success: false,
      created,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    }
  }
}