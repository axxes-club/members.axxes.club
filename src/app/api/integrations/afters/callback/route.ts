import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { integrationConnection } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"

const AFTERS_CLIENT_ID = process.env.AFTERS_CLIENT_ID!
const AFTERS_CLIENT_SECRET = process.env.AFTERS_CLIENT_SECRET!
const AFTERS_OAUTH_URL = process.env.AFTERS_OAUTH_URL || "https://afters.am"

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
  let stateData: { tenantId: string; userId: string; timestamp: number }
  try {
    stateData = JSON.parse(Buffer.from(state, "base64url").toString())
  } catch {
    return NextResponse.redirect(`${settingsUrl}?error=Invalid state parameter`)
  }

  // Verify state isn't too old (5 minutes)
  if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
    return NextResponse.redirect(`${settingsUrl}?error=Authorization request expired`)
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/afters/callback`

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(`${AFTERS_OAUTH_URL}/api/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: AFTERS_CLIENT_ID,
        client_secret: AFTERS_CLIENT_SECRET,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      console.error("Token exchange failed:", errorData)
      return NextResponse.redirect(
        `${settingsUrl}?error=${encodeURIComponent(errorData.error_description || "Failed to exchange authorization code")}`
      )
    }

    const tokens = await tokenResponse.json()
    const { access_token, refresh_token, expires_in, scope } = tokens

    // Get user info from Afters
    let userInfo: { sub?: string; email?: string; name?: string } = {}
    try {
      const userInfoResponse = await fetch(`${AFTERS_OAUTH_URL}/api/oauth/userinfo`, {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      if (userInfoResponse.ok) {
        userInfo = await userInfoResponse.json()
      }
    } catch {
      // Continue without user info
    }

    // Calculate token expiration
    const accessTokenExpiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : null

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
          accessToken: access_token,
          refreshToken: refresh_token,
          accessTokenExpiresAt: accessTokenExpiresAt,
          scope: scope,
          externalUserId: userInfo.sub,
          externalUserEmail: userInfo.email,
          externalUserName: userInfo.name,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(integrationConnection.id, existingConnection.id))
    } else {
      // Create new connection
      await db.insert(integrationConnection).values({
        tenantId: stateData.tenantId,
        userId: stateData.userId,
        provider: "afters",
        accessToken: access_token,
        refreshToken: refresh_token,
        accessTokenExpiresAt: accessTokenExpiresAt,
        scope: scope,
        externalUserId: userInfo.sub,
        externalUserEmail: userInfo.email,
        externalUserName: userInfo.name,
        isActive: true,
      })
    }

    return NextResponse.redirect(`${settingsUrl}?success=afters`)
  } catch (error) {
    console.error("Error in Afters OAuth callback:", error)
    return NextResponse.redirect(`${settingsUrl}?error=Failed to complete authorization`)
  }
}
