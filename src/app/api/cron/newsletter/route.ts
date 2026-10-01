import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { eq, and, lte } from "drizzle-orm"
import { newsletterCampaigns } from "@/lib/db/schema"
import { sendCampaign } from "@/lib/newsletter/email-sender"

/**
 * Vercel Cron Job endpoint for scheduled campaign sends
 * 
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/newsletter",
 *     "schedule": "* * * * *"
 *   }]
 * }
 * 
 * Or configure in Vercel Dashboard under Cron Jobs
 */

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const now = new Date()

    // Find all scheduled campaigns that are due to be sent
    const scheduledCampaigns = await db.query.newsletterCampaigns.findMany({
      where: and(
        eq(newsletterCampaigns.status, "scheduled"),
        lte(newsletterCampaigns.scheduledAt, now)
      ),
    })

    if (scheduledCampaigns.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No campaigns to send",
        sent: 0,
      })
    }

    const results = []

    for (const campaign of scheduledCampaigns) {
      try {
        const result = await sendCampaign(campaign.id)
        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          success: true,
          ...result,
        })
      } catch (error) {
        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })

        // Mark campaign as failed
        await db
          .update(newsletterCampaigns)
          .set({
            status: "failed",
            updatedAt: new Date(),
          })
          .where(eq(newsletterCampaigns.id, campaign.id))
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    })
  } catch (error) {
    console.error("Cron job error:", error)
    return NextResponse.json(
      { error: "Cron job failed" },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}