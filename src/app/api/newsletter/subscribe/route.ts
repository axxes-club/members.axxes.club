import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { subscriberLists, listMemberships, contacts, tenants } from "@/lib/db/schema"
import { nanoid } from "nanoid"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, listSlug, tenantSlug, firstName, lastName, source = "form" } = body

    if (!email || !listSlug) {
      return NextResponse.json(
        { error: "Email and list slug are required" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      )
    }

    // Find tenant by slug if provided
    let tenantId: string | undefined
    if (tenantSlug) {
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.slug, tenantSlug),
      })
      tenantId = tenant?.id
    }

    // Find the list by slug
    const listQuery = tenantId
      ? and(eq(subscriberLists.slug, listSlug), eq(subscriberLists.tenantId, tenantId))
      : eq(subscriberLists.slug, listSlug)

    const list = await db.query.subscriberLists.findFirst({
      where: listQuery,
    })

    if (!list) {
      return NextResponse.json(
        { error: "List not found" },
        { status: 404 }
      )
    }

    if (list.type === "private") {
      return NextResponse.json(
        { error: "This list is private and does not accept public subscriptions" },
        { status: 403 }
      )
    }

    // Find or create contact
    let contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.email, email),
        eq(contacts.tenantId, list.tenantId)
      ),
    })

    if (!contact) {
      const [newContact] = await db.insert(contacts).values({
        tenantId: list.tenantId,
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        type: "lead",
        leadStatus: "new",
        leadSource: "newsletter_subscription",
      }).returning()
      contact = newContact
    } else if (firstName || lastName) {
      // Update contact with additional info
      await db.update(contacts).set({
        firstName: firstName || contact.firstName,
        lastName: lastName || contact.lastName,
        updatedAt: new Date(),
      }).where(eq(contacts.id, contact.id))
    }

    // Check if already subscribed
    const existingMembership = await db.query.listMemberships.findFirst({
      where: and(
        eq(listMemberships.listId, list.id),
        eq(listMemberships.contactId, contact.id)
      ),
    })

    if (existingMembership) {
      if (existingMembership.status === "subscribed") {
        return NextResponse.json({
          success: true,
          message: "You are already subscribed to this list",
          requiresConfirmation: false,
        })
      }

      if (existingMembership.status === "pending") {
        return NextResponse.json({
          success: true,
          message: "Please check your email to confirm your subscription",
          requiresConfirmation: true,
        })
      }

      // Re-subscribe
      const optInToken = list.doubleOptIn ? nanoid(32) : null
      
      await db.update(listMemberships).set({
        status: list.doubleOptIn ? "pending" : "subscribed",
        subscribedAt: new Date(),
        unsubscribedAt: null,
        unsubscribeReason: null,
        source,
        optInToken,
        optInConfirmedAt: null,
        updatedAt: new Date(),
      }).where(eq(listMemberships.id, existingMembership.id))

      if (list.doubleOptIn && optInToken) {
        // TODO: Send confirmation email
        return NextResponse.json({
          success: true,
          message: "Please check your email to confirm your subscription",
          requiresConfirmation: true,
        })
      }

      // Update subscriber count
      await updateSubscriberCount(list.id)

      return NextResponse.json({
        success: true,
        message: "You have been re-subscribed successfully",
        requiresConfirmation: false,
      })
    }

    // Create new membership
    const optInToken = list.doubleOptIn ? nanoid(32) : null

    await db.insert(listMemberships).values({
      listId: list.id,
      contactId: contact.id,
      status: list.doubleOptIn ? "pending" : "subscribed",
      source,
      optInToken,
    })

    if (list.doubleOptIn && optInToken) {
      // TODO: Send confirmation email
      return NextResponse.json({
        success: true,
        message: "Please check your email to confirm your subscription",
        requiresConfirmation: true,
        optInToken,
      })
    }

    // Update subscriber count
    await updateSubscriberCount(list.id)

    return NextResponse.json({
      success: true,
      message: "You have been subscribed successfully",
      requiresConfirmation: false,
    })
  } catch (error) {
    console.error("Newsletter subscription error:", error)
    return NextResponse.json(
      { error: "An error occurred while processing your subscription" },
      { status: 500 }
    )
  }
}

async function updateSubscriberCount(listId: string) {
  const result = await db
    .select({ count: db.$count(listMemberships, eq(listMemberships.listId, listId)) })
    .from(listMemberships)
    .where(eq(listMemberships.status, "subscribed"))

  const count = result.length

  await db
    .update(subscriberLists)
    .set({ subscriberCount: count })
    .where(eq(subscriberLists.id, listId))
}

// Helper to count with conditions
declare module "@/lib/db" {
  interface Database {
    $count(table: any, where?: any): number
  }
}