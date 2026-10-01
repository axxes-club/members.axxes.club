import { NextRequest, NextResponse } from "next/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { tenantMemberships, tenants } from "@/lib/db/schema"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { and, asc, desc, eq, isNull } from "drizzle-orm"
import { publicOrigin } from "@/lib/public-origin"

async function getSession() {
  const headersList = await headers()
  const headersObj = new Headers()
  headersList.forEach((value, key) => {
    headersObj.set(key, value)
  })
  return auth.api.getSession({ headers: headersObj })
}

/**
 * Sends a member who already belongs to a workspace straight into it.
 *
 * The middleware sends anyone without a tenant_id cookie to /onboarding, which
 * is a workspace picker. That is right for somebody with several workspaces and
 * wrong for the common case: a member opening the portal on a new browser, who
 * gets asked to choose a workspace they have never heard of, next to an
 * inviting "create a business" button. To somebody who is simply signed in, it
 * reads as an account problem.
 *
 * So: if there is a membership, pick the primary one and go. Only somebody with
 * no membership at all still sees the picker. The middleware already skips
 * /onboarding when the cookie is set, so this runs at most once per browser.
 *
 * Deliberately a redirect, not JSON: this is a navigation, and it must set a
 * cookie, which a server component cannot do.
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")

  // is_primary is not unique in the schema and is not unique in this database,
  // so the earliest membership breaks the tie instead of trusting a flag that
  // can legitimately be true twice.
  const [membership] = await db
    .select({ tenantId: tenantMemberships.tenantId })
    .from(tenantMemberships)
    .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
    .where(and(eq(tenantMemberships.userId, session.user.id), isNull(tenantMemberships.deletedAt), isNull(tenants.deletedAt), eq(tenants.status, "active")))
    .orderBy(desc(tenantMemberships.isPrimary), asc(tenantMemberships.joinedAt))
    .limit(1)

  if (!membership) redirect("/onboarding")

  const next = new URL(publicOrigin(request))
  const destination = request.nextUrl.searchParams.get("next")
  // Same-origin only: an open redirect here would hand a signed-in member's
  // fresh session cookie to whatever host the query string named.
  next.pathname =
    destination && destination.startsWith("/") && !destination.startsWith("//")
      ? destination
      : "/dashboard"
  next.search = ""

  const response = NextResponse.redirect(next)
  response.cookies.set("tenant_id", membership.tenantId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })
  return response
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

    if (typeof tenantId !== "string" || !/^[0-9a-f-]{36}$/i.test(tenantId)) {
      return NextResponse.json(
        { error: "Tenant ID is required" },
        { status: 400 }
      )
    }

    // Verify user has access to this tenant
    const membership = await db.query.tenantMemberships.findFirst({
      where: and(
        eq(tenantMemberships.tenantId, tenantId),
        eq(tenantMemberships.userId, userId),
        isNull(tenantMemberships.deletedAt)
      ),
      with: {
        tenant: true,
      },
    })

    if (!membership || membership.tenant.deletedAt || membership.tenant.status !== "active") {
      return NextResponse.json(
        { error: "You don't have access to this business" },
        { status: 403 }
      )
    }

    // Create response with tenant cookie
    const response = NextResponse.json({
      success: true,
      data: {
        id: membership.tenant.id,
        name: membership.tenant.name,
        slug: membership.tenant.slug,
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
