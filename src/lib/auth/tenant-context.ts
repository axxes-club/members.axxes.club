import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { tenantMemberships } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { auth } from "@/lib/auth"

interface ApiErrorResponse {
  success: false
  error: { message: string }
}

function errorResponse(message: string, status: number): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    { success: false, error: { message } },
    { status }
  )
}

async function getSession() {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ")
  return auth.api.getSession({
    headers: new Headers({
      cookie: cookieHeader,
    }),
  })
}

export async function withTenantAccess(
  request: NextRequest,
  handler: (tenantId: string, userId: string) => Promise<NextResponse<unknown>>
): Promise<NextResponse<unknown>> {
  const session = await getSession()

  if (!session?.user) {
    return errorResponse("Unauthorized", 401)
  }

  const userId = session.user.id

  // Get tenant from cookie or query param
  const tenantId =
    request.cookies.get("tenant_id")?.value ||
    request.nextUrl.searchParams.get("tenantId")

  if (!tenantId) {
    return errorResponse("Tenant ID required", 400)
  }

  // Validate membership
  const membership = await db.query.tenantMemberships.findFirst({
    where: and(
      eq(tenantMemberships.userId, userId),
      eq(tenantMemberships.tenantId, tenantId)
    ),
  })

  if (!membership) {
    return errorResponse("Access denied to this tenant", 403)
  }

  return handler(tenantId, userId)
}

export async function withResourceAccess(
  request: NextRequest,
  _resourceTable: string,
  _resourceId: string,
  handler: (tenantId: string, userId: string) => Promise<NextResponse<unknown>>
): Promise<NextResponse<unknown>> {
  return withTenantAccess(request, handler)
}

// For server components and server actions.
//
// These three conditions are not exceptional — a signed-out visitor, or one who
// has not chosen a workspace yet, is an ordinary state that the middleware
// sends here. Throwing turned that state into Next's opaque "Application error:
// a server-side exception has occurred" page with a digest and no explanation,
// which is what /office was showing. Each one now redirects to the page that can
// resolve it, the same way getAuthContext() in @/lib/auth does.
//
// The route handlers that call this keep working unchanged: they use
// `.catch(() => null)` to mean "no context", and a redirect is thrown too, so
// they still fall through to their own 401.
export async function requireTenantAccess() {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ")
  const session = await auth.api.getSession({
    headers: new Headers({
      cookie: cookieHeader,
    }),
  })

  if (!session?.user) {
    redirect("/sign-in")
  }

  const userId = session.user.id
  const tenantId = cookieStore.get("tenant_id")?.value

  if (!tenantId) {
    redirect("/onboarding")
  }

  const membership = await db.query.tenantMemberships.findFirst({
    where: and(
      eq(tenantMemberships.userId, userId),
      eq(tenantMemberships.tenantId, tenantId)
    ),
    with: {
      tenant: true,
    },
  })

  if (!membership) {
    // The cookie names a workspace this account is not in — left over from
    // another account on the same browser, or the membership was removed.
    // /onboarding cannot fix it: the middleware bounces /onboarding back to
    // /dashboard whenever tenant_id is set, which would loop. /sign-out clears
    // the stale cookie and starts a clean sign-in, which can.
    redirect("/sign-out")
  }

  return {
    tenantId,
    userId,
    tenant: membership.tenant,
    role: membership.role,
  }
}
