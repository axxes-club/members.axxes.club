/**
 * Afters Webhook Handler
 * Receives real-time events from Afters.am
 */

import { NextRequest, NextResponse } from "next/server"
import { getIntegration } from "@/lib/integrations"
import { db } from "@/lib/db"
import { integrationConnection } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { createHmac } from "crypto"

const AFTERS_WEBHOOK_SECRET = process.env.AFTERS_WEBHOOK_SECRET

// Verify webhook signature
function verifySignature(payload: string, signature: string, secret: string): boolean {
  // Simple HMAC verification - adjust based on Afters' actual implementation
  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest("hex")
  
  return signature === expectedSignature
}

export async function POST({ text, headers }: NextRequest) {
  try {
    const body = await text()
    const signature = headers.get("x-afters-signature") || ""
    
    // Verify webhook signature if secret is configured
    if (AFTERS_WEBHOOK_SECRET && !verifySignature(body, signature, AFTERS_WEBHOOK_SECRET)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
    
    const payload = JSON.parse(body)
    
    // Validate required fields
    const { event_type, tenant_id, data } = payload
    
    if (!event_type || !tenant_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    
    // Find the integration connection for this tenant
    const connection = await db.query.integrationConnection.findFirst({
      where: and(
        eq(integrationConnection.tenantId, tenant_id),
        eq(integrationConnection.provider, "afters"),
        eq(integrationConnection.isActive, true)
      ),
    })
    
    if (!connection) {
      return NextResponse.json({ error: "No active connection found" }, { status: 404 })
    }
    
    // Get the Afters integration handler
    const integration = getIntegration("afters")
    
    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 500 })
    }
    
    // Handle the webhook event
    const result = await integration.handleWebhook({
      eventType: event_type,
      payload: {
        tenant_id,
        ...data,
      },
      signature,
    })
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        action: result.action,
        processed_at: new Date().toISOString(),
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: "Failed to process webhook" 
      }, { status: 500 })
    }
  } catch (error) {
    console.error("Afters webhook error:", error)
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 })
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    endpoint: "afters-webhook",
    timestamp: new Date().toISOString(),
  })
}