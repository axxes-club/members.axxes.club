import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { trackedLinks, newsletterEvents, newsletterSends, newsletterCampaigns } from "@/lib/db/schema"
import { publicOrigin } from "@/lib/public-origin"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // Find the tracked link
  const link = await db.query.trackedLinks.findFirst({
    where: eq(trackedLinks.linkToken, token),
  })

  if (!link) {
    return NextResponse.redirect(new URL("/", publicOrigin(request)))
  }

  // Get send record from campaign to find the contact
  // For click tracking, we may not always have the send context
  // So we'll record the click without a specific send

  // Record the click event
  await db.insert(newsletterEvents).values({
    tenantId: link.tenantId,
    campaignId: link.campaignId,
    event: "clicked",
    url: link.originalUrl,
    linkId: token,
    userAgent: request.headers.get("user-agent"),
    ipAddress: request.headers.get("x-forwarded-for") || 
               request.headers.get("x-real-ip") || 
               "unknown",
    occurredAt: new Date(),
  })

  // Update link click count
  await db
    .update(trackedLinks)
    .set({
      clickCount: (link.clickCount ?? 0) + 1,
    })
    .where(eq(trackedLinks.id, link.id))

  // Update campaign clicked count
  const campaign = await db.query.newsletterCampaigns.findFirst({
    where: eq(newsletterCampaigns.id, link.campaignId),
  })

  if (campaign) {
    await db
      .update(newsletterCampaigns)
      .set({
        clickedCount: (campaign.clickedCount ?? 0) + 1,
      })
      .where(eq(newsletterCampaigns.id, link.campaignId))
  }

  // Redirect to original URL
  return NextResponse.redirect(link.originalUrl)
}