import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { integrationConnection } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"

const AFTERS_CLIENT_ID = process.env.AFTERS_CLIENT_ID!
const AFTERS_OAUTH_URL = process.env.AFTERS_OAUTH_URL || "https://afters.am"

// GET - Check connection status
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get tenant from session or context
    const tenantId = session.session?.activeOrganizationId
    if (!tenantId) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 })
    }

    const connection = await db.query.integrationConnection.findFirst({
      where: and(
        eq(integrationConnection.tenantId, tenantId),
        eq(integrationConnection.provider, "afters"),
        eq(integrationConnection.isActive, true)
      ),
    })

    if (!connection) {
      return NextResponse.json({ connected: false })
    }

    return NextResponse.json({
      connected: true,
      externalUserEmail: connection.externalUserEmail,
      externalUserName: connection.externalUserName,
      connectedAt: connection.createdAt,
    })
  } catch (error) {
    console.error("Error checking Afters connection:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Initiate OAuth flow (returns authorization URL)
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tenantId = session.session?.activeOrganizationId
    if (!tenantId) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const scopes = body.scopes || ["read:profile", "read:events", "read:orders"]

    // Generate state with tenant info for callback
    const state = Buffer.from(JSON.stringify({
      tenantId,
      userId: session.user.id,
      timestamp: Date.now(),
    })).toString("base64url")

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/afters/callback`

    const authUrl = new URL(`${AFTERS_OAUTH_URL}/oauth/authorize`)
    authUrl.searchParams.set("client_id", AFTERS_CLIENT_ID)
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("scope", scopes.join(" "))
    authUrl.searchParams.set("state", state)

    return NextResponse.json({ authorizationUrl: authUrl.toString() })
  } catch (error) {
    console.error("Error initiating Afters OAuth:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Disconnect integration
export async function DELETE() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tenantId = session.session?.activeOrganizationId
    if (!tenantId) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 })
    }

    // Find the connection
    const connection = await db.query.integrationConnection.findFirst({
      where: and(
        eq(integrationConnection.tenantId, tenantId),
        eq(integrationConnection.provider, "afters")
      ),
    })

    if (connection?.accessToken) {
      // Revoke token at Afters
      try {
        await fetch(`${AFTERS_OAUTH_URL}/api/oauth/revoke`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: connection.accessToken }),
        })
      } catch {
        // Ignore revocation errors
      }
    }

    // Delete the connection
    await db.delete(integrationConnection).where(
      and(
        eq(integrationConnection.tenantId, tenantId),
        eq(integrationConnection.provider, "afters")
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error disconnecting Afters:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
