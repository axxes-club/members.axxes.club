/**
 * Afters OAuth Callback
 * Handles the OAuth callback from Afters.am
 */

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { integrationConnection } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getIntegration } from "@/lib/integrations"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")

  const settingsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations`

  // Handle errors from Afters
  if (error) {
    console.error("Afters OAuth error:", error, errorDescription)
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(`${settingsUrl}?error=Missing authorization code or state`)
  }

  // Decode state
  let stateData: { tenantId: string; userId: string; provider: string; timestamp: number }
  try {
    stateData = JSON.parse(Buffer.from(state, "base64url").toString())
  } catch {
    return NextResponse.redirect(`${settingsUrl}?error=Invalid state parameter`)
  }

  // Verify state isn't too old (5 minutes)
  if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
    return NextResponse.redirect(`${settingsUrl}?error=Authorization request expired`)
  }

  // Verify provider
  if (stateData.provider !== "afters") {
    return NextResponse.redirect(`${settingsUrl}?error=Invalid provider`)
  }

  try {
    // Get the integration
    const integration = getIntegration("afters")
    if (!integration) {
      return NextResponse.redirect(`${settingsUrl}?error=Integration not found`)
    }

    // Exchange code for tokens
    const tokens = await integration.exchangeCodeForTokens(code)

    // Get user info from Afters
    const userInfo = await integration.getUserInfo(tokens.accessToken)

    // Calculate token expiration
    const accessTokenExpiresAt = tokens.expiresAt || null

    // Check for existing connection
    const existingConnection = await db.query.integrationConnection.findFirst({
      where: and(
        eq(integrationConnection.tenantId, stateData.tenantId),
        eq(integrationConnection.provider, "afters")
      ),
    })

    if (existingConnection) {
      // Update existing connection
      await db.update(integrationConnection)
        .set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          accessTokenExpiresAt: accessTokenExpiresAt,
          scope: tokens.scope,
          externalUserId: userInfo.id,
          externalUserEmail: userInfo.email,
          externalUserName: userInfo.name,
          isActive: true,
          metadata: {
            syncEnabled: true,
            syncFrequency: "hourly",
          },
          updatedAt: new Date(),
        })
        .where(eq(integrationConnection.id, existingConnection.id))
    } else {
      // Create new connection
      await db.insert(integrationConnection).values({
        tenantId: stateData.tenantId,
        userId: stateData.userId,
        provider: "afters",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: accessTokenExpiresAt,
        scope: tokens.scope,
        externalUserId: userInfo.id,
        externalUserEmail: userInfo.email,
        externalUserName: userInfo.name,
        isActive: true,
        metadata: {
          syncEnabled: true,
          syncFrequency: "hourly",
        },
      })
    }

    return NextResponse.redirect(`${settingsUrl}?success=afters`)
  } catch (error) {
    console.error("Error in Afters OAuth callback:", error)
    const message = error instanceof Error ? error.message : "Failed to complete authorization"
    return NextResponse.redirect(`${settingsUrl}?error=${encodeURIComponent(message)}`)
  }
}