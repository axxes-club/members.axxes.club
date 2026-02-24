import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { newsletterSends, newsletterEvents, newsletterCampaigns } from "@/lib/db/schema"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // Find the send record by tracking token
  const send = await db.query.newsletterSends.findFirst({
    where: eq(newsletterSends.trackingToken, token),
  })

  if (!send) {
    // Return a 1x1 transparent pixel anyway
    return new NextResponse(Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"), {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    })
  }

  // Check if this is the first open
  const isFirstOpen = !send.firstOpenedAt

  // Record the open event
  await db.insert(newsletterEvents).values({
    tenantId: send.tenantId,
    campaignId: send.campaignId,
    sendId: send.id,
    contactId: send.contactId,
    event: "opened",
    userAgent: request.headers.get("user-agent"),
    ipAddress: request.headers.get("x-forwarded-for") || 
               request.headers.get("x-real-ip") || 
               "unknown",
    occurredAt: new Date(),
  })

  // Update send record
  await db
    .update(newsletterSends)
    .set({
      firstOpenedAt: isFirstOpen ? new Date() : send.firstOpenedAt,
      lastOpenedAt: new Date(),
      openCount: (send.openCount ?? 0) + 1,
      updatedAt: new Date(),
    })
    .where(eq(newsletterSends.id, send.id))

  // Update campaign opened count (only for unique opens)
  if (isFirstOpen) {
    const campaign = await db.query.newsletterCampaigns.findFirst({
      where: eq(newsletterCampaigns.id, send.campaignId),
    })

    if (campaign) {
      await db
        .update(newsletterCampaigns)
        .set({
          openedCount: (campaign.openedCount ?? 0) + 1,
        })
        .where(eq(newsletterCampaigns.id, send.campaignId))
    }
  }

  // Return a 1x1 transparent pixel
  return new NextResponse(Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"), {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  })
}