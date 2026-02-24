import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { tenantMemberships } from "@/lib/db/schema"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { eq, and } from "drizzle-orm"

async function getSession() {
  const headersList = await headers()
  const headersObj = new Headers()
  headersList.forEach((value, key) => {
    headersObj.set(key, value)
  })
  return auth.api.getSession({ headers: headersObj })
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const body = await request.json()
    const { tenantId } = body

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID is required" },
        { status: 400 }
      )
    }

    // Verify user has access to this tenant
    const membership = await db.query.tenantMemberships.findFirst({
      where: and(
        eq(tenantMemberships.tenantId, tenantId),
        eq(tenantMemberships.userId, userId)
      ),
      with: {
        tenant: true,
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: "You don't have access to this business" },
        { status: 403 }
      )
    }

    // Create response with tenant cookie
    const response = NextResponse.json({
      success: true,
      data: {
        id: (membership.tenant as { id: string }).id,
        name: (membership.tenant as { name: string }).name,
        slug: (membership.tenant as { slug: string }).slug,
      },
    })

    // Set tenant ID cookie
    response.cookies.set("tenant_id", tenantId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    })

    return response
  } catch (error) {
    console.error("Failed to select tenant:", error)
    return NextResponse.json(
      { error: "Failed to select business" },
      { status: 500 }
    )
  }
}
