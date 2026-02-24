/**
 * Development Auto-Auth
 * Automatically authenticates a demo user in development environments only.
 * Access: /?devauth or /sign-in?devauth
 */

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { user, tenants, tenantMemberships, session as sessionTable } from "@/lib/db/schema"
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
  console.log("[dev-auth] Request received, NODE_ENV:", process.env.NODE_ENV, "VERCEL_ENV:", process.env.VERCEL_ENV)

  // Security check: only allow in dev/preview
  if (!isDevelopmentEnvironment()) {
    console.log("[dev-auth] Blocked - not in dev environment")
    return NextResponse.json(
      { error: "Dev auth only available in development/preview environments" },
      { status: 403 }
    )
  }

  try {
    // Find or create demo user
    const demoEmail = "demo@axxes.club"
    console.log("[dev-auth] Looking for user:", demoEmail)

    let userRecord = await db.query.user.findFirst({
      where: eq(user.email, demoEmail),
    })

    if (!userRecord) {
      console.log("[dev-auth] Creating new demo user")
      // Create demo user
      const userId = nanoid()
      const [newUser] = await db.insert(user).values({
        id: userId,
        email: demoEmail,
        name: "Demo User",
        emailVerified: true,
      }).returning()
      userRecord = newUser
      console.log("[dev-auth] Created user:", userRecord.id)
    } else {
      console.log("[dev-auth] Found existing user:", userRecord.id)
    }

    // Find or create demo tenant
    let tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, "demo"),
    })

    if (!tenant) {
      console.log("[dev-auth] Creating demo tenant")
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
      console.log("[dev-auth] Created tenant:", tenant.id)
    } else {
      console.log("[dev-auth] Found existing tenant:", tenant.id)

      // Check if membership exists
      const membership = await db.query.tenantMemberships.findFirst({
        where: eq(tenantMemberships.userId, userRecord.id),
      })

      if (!membership) {
        console.log("[dev-auth] Adding user to tenant")
        await db.insert(tenantMemberships).values({
          tenantId: tenant.id,
          userId: userRecord.id,
          role: "owner",
        })
      }
    }

    // Create session manually
    const sessionId = nanoid()
    const sessionToken = nanoid(32)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    console.log("[dev-auth] Creating session")

    await db.insert(sessionTable).values({
      id: sessionId,
      token: sessionToken,
      userId: userRecord.id,
      expiresAt,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "unknown",
    })
    console.log("[dev-auth] Session created:", sessionToken.substring(0, 8) + "...")

    // Create response with redirect to dashboard
    const response = NextResponse.redirect(new URL("/dashboard", request.url))

    // Set the session cookie (Better Auth uses 'better-auth.session_token')
    response.cookies.set("better-auth.session_token", sessionToken, {
      httpOnly: true,
      secure: false, // Always false for local dev
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    // Set tenant cookie
    response.cookies.set("tenant_id", tenant.id, {
      httpOnly: false,
      secure: false, // Always false for local dev
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    console.log("[dev-auth] Success - redirecting to dashboard")
    return response
  } catch (error) {
    console.error("[dev-auth] Error:", error)
    return NextResponse.json(
      { error: "Failed to authenticate", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
