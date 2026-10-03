import { NextRequest, NextResponse } from "next/server"
import { getPusherServer } from "@/lib/pusher/server"
import { auth } from "@/lib/auth"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { conversationParticipants, tenantMemberships } from "@/lib/db/schema"
import { eq, and, isNull } from "drizzle-orm"
import { rawCookieHeader } from "@/lib/auth/raw-cookie"

async function getSession() {

  const cookieHeader = await rawCookieHeader()

  return auth.api.getSession({
    headers: new Headers({
      cookie: cookieHeader,
    }),
  })
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.text()
    const params = new URLSearchParams(body)
    const socketId = params.get("socket_id")
    const channelName = params.get("channel_name")

    if (!socketId || !channelName) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const userId = session.user.id
    const cookieStore = await cookies()
    const tenantId = cookieStore.get("tenant_id")?.value

    // Validate channel access based on channel type
    if (channelName.startsWith("private-conversation-")) {
      const conversationId = channelName.replace("private-conversation-", "")

      // Verify user is a participant in this conversation
      const participant = await db.query.conversationParticipants.findFirst({
        where: and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId),
          isNull(conversationParticipants.leftAt)
        ),
      })

      if (!participant) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    } else if (channelName.startsWith("private-user-")) {
      const channelUserId = channelName.replace("private-user-", "")

      // User can only subscribe to their own channel
      if (channelUserId !== userId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    } else if (channelName.startsWith("private-tenant-")) {
      const channelTenantId = channelName.replace("private-tenant-", "")

      if (!tenantId || channelTenantId !== tenantId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }

      // Verify tenant membership
      const membership = await db.query.tenantMemberships.findFirst({
        where: and(
          eq(tenantMemberships.tenantId, tenantId),
          eq(tenantMemberships.userId, userId),
          isNull(tenantMemberships.deletedAt)
        ),
      })

      if (!membership) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: "Invalid channel" }, { status: 400 })
    }

    // Authorize the channel
    const pusher = getPusherServer()
    const authResponse = pusher.authorizeChannel(socketId, channelName, {
      user_id: userId,
    })

    return NextResponse.json(authResponse)
  } catch (error) {
    console.error("Pusher auth error:", error)
    return NextResponse.json({ error: "Auth failed" }, { status: 500 })
  }
}
