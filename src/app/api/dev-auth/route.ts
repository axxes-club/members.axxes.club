/**
 * Development Auto-Auth
 * Automatically authenticates a demo user in development environments only.
 * Access: /?devauth or /sign-in?devauth
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { user, tenants, tenantMemberships, session as sessionTable, account } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"

// Only allow in development/preview environments
function isDevelopmentEnvironment(): boolean {
  const vercelEnv = process.env.VERCEL_ENV
  const nodeEnv = process.env.NODE_ENV

  return (
    nodeEnv === "development" ||
    vercelEnv === "preview" ||
    !process.env.VERCEL // Local development
  )
}

export async function GET(request: NextRequest) {
  // Security check: only allow in dev/preview
  if (!isDevelopmentEnvironment()) {
    return NextResponse.json(
      { error: "Dev auth only available in development/preview environments" },
      { status: 403 }
    )
  }

  try {
    // Find or create demo user
    const demoEmail = "demo@axxes.club"

    let userRecord = await db.query.user.findFirst({
      where: eq(user.email, demoEmail),
    })

    if (!userRecord) {
      // Create demo user with password hash for "password123"
      const userId = nanoid()
      const [newUser] = await db.insert(user).values({
        id: userId,
        email: demoEmail,
        name: "Demo User",
        emailVerified: true,
      }).returning()
      userRecord = newUser

      // Create account with password (bcrypt hash of "password123")
      const bcryptHash = "$2a$10$LqXbOKVvhq3dZlqXbOKVvhq3dZlqXbOKVvhq3dZlqXbOKVvhq3dZl" // dummy hash
      await db.insert(account).values({
        id: nanoid(),
        userId: userRecord.id,
        providerId: "credential",
        accountId: userRecord.id,
        password: bcryptHash,
      })
    }

    // Find or create demo tenant
    let tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, "demo"),
    })

    if (!tenant) {
      // Create demo tenant
      const [newTenant] = await db.insert(tenants).values({
        name: "Demo Company",
        slug: "demo",
        ownerId: userRecord.id,
        status: "active",
      }).returning()
      tenant = newTenant

      // Add user as owner of demo tenant
      await db.insert(tenantMemberships).values({
        tenantId: tenant.id,
        userId: userRecord.id,
        role: "owner",
      })
    }

    // Check if user is already a member of demo tenant
    const membership = await db.query.tenantMemberships.findFirst({
      where: eq(tenantMemberships.userId, userRecord.id),
    })

    if (!membership) {
      // Add user as owner
      await db.insert(tenantMemberships).values({
        tenantId: tenant.id,
        userId: userRecord.id,
        role: "owner",
      })
    }

    // Create session manually
    const sessionId = nanoid()
    const sessionToken = nanoid(32)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await db.insert(sessionTable).values({
      id: sessionId,
      token: sessionToken,
      userId: userRecord.id,
      expiresAt,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || null,
      userAgent: request.headers.get("user-agent") || null,
    })

    // Create response with redirect to dashboard
    const response = NextResponse.redirect(new URL("/dashboard", request.url))

    // Set the session cookie (Better Auth uses 'better-auth.session_token')
    response.cookies.set("better-auth.session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    // Set tenant cookie
    response.cookies.set("tenant_id", tenant.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    return response
  } catch (error) {
    console.error("Dev auth error:", error)
    return NextResponse.json(
      { error: "Failed to authenticate" },
      { status: 500 }
    )
  }
}
