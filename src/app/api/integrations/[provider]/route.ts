import {platformAccessAllowed} from '@/lib/platform-access';
/**
 * Generic Integration API Route
 * Handles connection status, OAuth initiation, and disconnection for any provider
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
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params
    const context = await getSessionWithTenant()
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const integration = getIntegration(provider)
    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    const connectionState = await integration.getConnectionState(context.tenantId)

    return NextResponse.json(connectionState)
  } catch (error) {
    console.error("Error checking connection:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Initiate OAuth flow or connect with API key
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params
    const context = await getSessionWithTenant()
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const integration = getIntegration(provider)
    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))

    // Handle OAuth flow
    if (integration.meta.authType === "oauth") {
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
    }

    // Handle API key flow
    if (integration.meta.authType === "apikey") {
      const { apiKey, accountId } = body

      if (!apiKey) {
        return NextResponse.json({ error: "API key is required" }, { status: 400 })
      }

      // Validate API key
      const isValid = await integration.validateApiKey(apiKey, accountId)
      if (!isValid) {
        return NextResponse.json({ error: "Invalid API key" }, { status: 400 })
      }

      // Store the connection
      await db.insert(integrationConnection).values({
        tenantId: context.tenantId,
        userId: context.userId,
        provider: provider,
        apiKey: apiKey,
        accountId: accountId || null,
        isActive: true,
        metadata: {
          syncEnabled: true,
          syncFrequency: "hourly",
        },
      })
      .onConflictDoUpdate({
        target: [integrationConnection.tenantId, integrationConnection.provider],
        set: {
          apiKey: apiKey,
          accountId: accountId || null,
          isActive: true,
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Unknown authentication type" }, { status: 400 })
  } catch (error) {
    console.error("Error connecting integration:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Disconnect integration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params
    const context = await getSessionWithTenant()
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find the connection
    const connection = await db.query.integrationConnection.findFirst({
      where: and(
        eq(integrationConnection.tenantId, context.tenantId),
        eq(integrationConnection.provider, provider)
      ),
    })

    if (connection?.accessToken) {
      const integration = getIntegration(provider)
      if (integration) {
        // Revoke token at provider
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
    console.error("Error disconnecting integration:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH - Update integration settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params
    const context = await getSessionWithTenant()
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { syncEnabled, syncFrequency } = body

    const connection = await db.query.integrationConnection.findFirst({
      where: and(
        eq(integrationConnection.tenantId, context.tenantId),
        eq(integrationConnection.provider, provider),
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
    console.error("Error updating integration settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}