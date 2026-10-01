import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { tenants, tenantMemberships } from "@/lib/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { nanoid } from "nanoid"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

async function getSession() {
  const headersList = await headers()
  // Convert ReadonlyHeaders to standard Headers
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
    const { name } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Business name is required" },
        { status: 400 }
      )
    }

    // Generate a URL-friendly slug from the business name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .substring(0, 50)
      + "-" + nanoid(6)

    // Create the tenant
    const [tenant] = await db
      .insert(tenants)
      .values({
        name: name.trim(),
        slug,
        type: "business",
        status: "active",
        ownerId: userId,
      })
      .returning()

    // Create membership for the owner
    await db.insert(tenantMemberships).values({
      tenantId: tenant.id,
      userId,
      role: "owner",
    })

    // Create response with tenant cookie
    const response = NextResponse.json({
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
    })

    // Set tenant ID cookie (httpOnly, secure in production)
    response.cookies.set("tenant_id", tenant.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    })

    return response
  } catch (error) {
    console.error("Failed to create tenant:", error)
    return NextResponse.json(
      { error: "Failed to create business" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get all tenants the user is a member of
    const memberships = await db.query.tenantMemberships.findMany({
      where: and(eq(tenantMemberships.userId, userId), isNull(tenantMemberships.deletedAt)),
      with: {
        tenant: true,
      },
    })

    const userTenants = memberships.filter(m => !m.tenant.deletedAt && m.tenant.status === "active").map((m) => ({
      id: m.tenant.id,
      name: m.tenant.name,
      slug: m.tenant.slug,
      role: m.role,
    }))

    return NextResponse.json({
      success: true,
      data: userTenants,
    })
  } catch (error) {
    console.error("Failed to fetch tenants:", error)
    return NextResponse.json(
      { error: "Failed to fetch businesses" },
      { status: 500 }
    )
  }
}
