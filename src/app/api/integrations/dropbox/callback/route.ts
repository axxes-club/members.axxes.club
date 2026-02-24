/**
 * Dropbox OAuth Callback
 * Handles the OAuth callback from Dropbox
 */

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { integrationConnection } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getIntegration } from "@/lib/integrations"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")

  const settingsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations`

  // Handle errors from Dropbox
  if (error) {
    console.error("Dropbox OAuth error:", error, errorDescription)
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(`${settingsUrl}?error=Missing authorization code`)
  }

  try {
    // Get the integration
    const integration = getIntegration("dropbox")
    if (!integration) {
      return NextResponse.redirect(`${settingsUrl}?error=Integration not found`)
    }

    // Exchange code for tokens
    const tokens = await integration.exchangeCodeForTokens(code)

    // Get user info from Dropbox
    const userInfo = await integration.getUserInfo(tokens.accessToken)

    // Calculate token expiration
    const accessTokenExpiresAt = tokens.expiresAt || null

    // Check for existing connection
    const existingConnection = await db.query.integrationConnection.findFirst({
      where: and(
        eq(integrationConnection.tenantId, integrationConnection.tenantId),
        eq(integrationConnection.provider, "dropbox")
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
      // Create new connection - need to get tenant from cookie
      const cookieStore = await request.cookies
      const tenantId = cookieStore.get("tenant_id")?.value

      if (!tenantId) {
        return NextResponse.redirect(`${settingsUrl}?error=No active tenant`)
      }

      const sessionCookie = cookieStore.get("better-auth.session_token")?.value
      if (!sessionCookie) {
        return NextResponse.redirect(`${settingsUrl}?error=Not authenticated`)
      }

      // Get user from session to get userId
      const { auth } = await import("@/lib/auth")
      const session = await auth.api.getSession({
        headers: new Headers({ cookie: `better-auth.session_token=${sessionCookie}` }),
      })

      if (!session?.user?.id) {
        return NextResponse.redirect(`${settingsUrl}?error=Not authenticated`)
      }

      await db.insert(integrationConnection).values({
        tenantId,
        userId: session.user.id,
        provider: "dropbox",
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

    return NextResponse.redirect(`${settingsUrl}?success=dropbox`)
  } catch (error) {
    console.error("Error in Dropbox OAuth callback:", error)
    const message = error instanceof Error ? error.message : "Failed to complete authorization"
    return NextResponse.redirect(`${settingsUrl}?error=${encodeURIComponent(message)}`)
  }
}
