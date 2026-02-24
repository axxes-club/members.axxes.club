/**
 * Afters Sync Endpoint
 * Manual sync trigger for events and orders
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers, cookies } from "next/headers"
import { getIntegration } from "@/lib/integrations"
import { db } from "@/lib/db"
import { integrationConnection } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

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

  return { userId: session.user.id, tenantId }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getSessionWithTenant()
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { entityType, fullSync } = body

    // Get the integration
    const integration = getIntegration("afters")
    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 500 })
    }

    // Check if connection exists and is active
    const connection = await db.query.integrationConnection.findFirst({
      where: and(
        eq(integrationConnection.tenantId, context.tenantId),
        eq(integrationConnection.provider, "afters"),
        eq(integrationConnection.isActive, true)
      ),
    })

    if (!connection) {
      return NextResponse.json({ error: "No active connection" }, { status: 400 })
    }

    let result

    switch (entityType) {
      case "events":
        result = await integration.syncEvents(context.tenantId, fullSync)
        break
      
      case "orders":
        result = await integration.syncOrders(context.tenantId, fullSync)
        break
      
      case "all":
        // Sync both events and orders
        const eventsResult = await integration.syncEvents(context.tenantId, fullSync)
        const ordersResult = await integration.syncOrders(context.tenantId, fullSync)
        
        result = {
          success: eventsResult.success && ordersResult.success,
          provider: "afters",
          entityType: "all",
          pulled: eventsResult.pulled + ordersResult.pulled,
          pushed: 0,
          updated: eventsResult.updated + ordersResult.updated,
          failed: eventsResult.failed + ordersResult.failed,
          errors: [...eventsResult.errors, ...ordersResult.errors],
          startedAt: eventsResult.startedAt,
          completedAt: new Date(),
          details: {
            events: eventsResult,
            orders: ordersResult,
          },
        }
        break
      
      default:
        return NextResponse.json({ 
          error: "Invalid entity type. Use 'events', 'orders', or 'all'" 
        }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Sync error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 })
  }
}

// GET sync status
export async function GET(request: NextRequest) {
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

    return NextResponse.json({
      provider: "afters",
      connection: connectionState,
    })
  } catch (error) {
    console.error("Error getting sync status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}