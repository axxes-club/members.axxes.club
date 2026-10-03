import {platformAccessAllowed} from '@/lib/platform-access';
/**
 * Afters Integration API
 * Handles connection status, OAuth initiation, and disconnection
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers, cookies } from "next/headers"
import { db } from "@/lib/db"
import { integrationConnection } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getIntegration } from "@/lib/integrations"

async function getSessionWithTenant() {
  const headersList = await headers()
  const cookieStore = await cookies()
  
  const session = await auth.api.getSession({ headers: headersList })
  if (!session?.user?.id) {
    return null
  }

  const tenantId = cookieStore.get("tenant_id")?.value
  if (!tenantId) {
    return null
  }

  if(!await platformAccessAllowed(session.user.id,tenantId))return null;
  return { userId: session.user.id, tenantId }
}

// GET - Check connection status
export async function GET() {
  try {
    const context = await getSessionWithTenant()
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const integration = getIntegration("afters")
    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 500 })
    }

    const connectionState = await integration.getConnectionState(context.tenantId)

    return NextResponse.json(connectionState)
  } catch (error) {
    console.error("Error checking Afters connection:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Initiate OAuth flow (returns authorization URL)
export async function POST(request: NextRequest) {
  try {
    const context = await getSessionWithTenant()
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const integration = getIntegration("afters")
    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const scopes = body.scopes

    const authorizationUrl = await integration.getAuthorizationUrl(
      context.tenantId,
      context.userId,
      scopes
    )

    if (!authorizationUrl) {
      return NextResponse.json({ error: "Failed to generate authorization URL" }, { status: 500 })
    }

    return NextResponse.json({ authorizationUrl })
  } catch (error) {
    console.error("Error initiating Afters OAuth:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Disconnect integration
export async function DELETE() {
  try {
    const context = await getSessionWithTenant()
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find the connection
    const connection = await db.query.integrationConnection.findFirst({
      where: and(
        eq(integrationConnection.tenantId, context.tenantId),
        eq(integrationConnection.provider, "afters")
      ),
    })

    if (connection?.accessToken) {
      const integration = getIntegration("afters")
      if (integration) {
        // Revoke token at Afters
        await integration.revokeAccess(connection.accessToken)
      }
    }

    // Delete the connection
    if (connection) {
      await db.delete(integrationConnection).where(
        eq(integrationConnection.id, connection.id)
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error disconnecting Afters:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH - Update integration settings (e.g., toggle sync)
export async function PATCH(request: NextRequest) {
  try {
    const context = await getSessionWithTenant()
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { syncEnabled, syncFrequency } = body

    const connection = await db.query.integrationConnection.findFirst({
      where: and(
        eq(integrationConnection.tenantId, context.tenantId),
        eq(integrationConnection.provider, "afters"),
        eq(integrationConnection.isActive, true)
      ),
    })

    if (!connection) {
      return NextResponse.json({ error: "No active connection" }, { status: 404 })
    }

    // Update connection settings
    await db.update(integrationConnection)
      .set({
        metadata: {
          ...(connection.metadata as Record<string, unknown> || {}),
          syncEnabled: syncEnabled ?? true,
          syncFrequency: syncFrequency ?? "hourly",
        },
        updatedAt: new Date(),
      })
      .where(eq(integrationConnection.id, connection.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating Afters settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}