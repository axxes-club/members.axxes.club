import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { newsletterSends, listMemberships, newsletterEvents, newsletterCampaigns } from "@/lib/db/schema"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, campaignId, reason } = body

    if (!token) {
      return NextResponse.json(
        { error: "Unsubscribe token is required" },
        { status: 400 }
      )
    }

    // Find the send record by tracking token
    const send = await db.query.newsletterSends.findFirst({
      where: eq(newsletterSends.trackingToken, token),
    })

    if (!send) {
      return NextResponse.json(
        { error: "Invalid unsubscribe token" },
        { status: 400 }
      )
    }

    // Find the list membership
    const membership = await db.query.listMemberships.findFirst({
      where: eq(listMemberships.contactId, send.contactId),
      with: { list: true },
    })

    if (membership) {
      // Update membership status
      await db.update(listMemberships).set({
        status: "unsubscribed",
        unsubscribedAt: new Date(),
        unsubscribeReason: reason || null,
        updatedAt: new Date(),
      }).where(eq(listMemberships.id, membership.id))

      // Update list subscriber count
      const list = membership.list
      if (list) {
        const result = await db
          .select({ count: db.$count(listMemberships, eq(listMemberships.listId, list.id)) })
          .from(listMemberships)
          .where(eq(listMemberships.status, "subscribed"))

        await db
          .update(newsletterCampaigns)
          .set({ subscriberCount: result.length })
          .where(eq(newsletterCampaigns.id, list.id))
      }
    }

    // Record unsubscribe event
    await db.insert(newsletterEvents).values({
      tenantId: send.tenantId,
      campaignId: send.campaignId,
      sendId: send.id,
      contactId: send.contactId,
      event: "unsubscribed",
      occurredAt: new Date(),
    })

    // Update campaign unsubscribed count
    const campaign = await db.query.newsletterCampaigns.findFirst({
      where: eq(newsletterCampaigns.id, send.campaignId),
    })

    if (campaign) {
      await db
        .update(newsletterCampaigns)
        .set({
          unsubscribedCount: (campaign.unsubscribedCount ?? 0) + 1,
        })
        .where(eq(newsletterCampaigns.id, campaign.id))
    }

    return NextResponse.json({
      success: true,
      message: "You have been unsubscribed successfully",
    })
  } catch (error) {
    console.error("Unsubscribe error:", error)
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    )
  }
}