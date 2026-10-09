import {wrapAdmission} from '@/lib/security/admission-server';
import { NextRequest, NextResponse } from "next/server"
import { sendCampaign } from "@/lib/newsletter/email-sender"

async function POSTHandler(request: NextRequest) {
  try {
    const body = await request.json()
    const { campaignId } = body

    if (!campaignId) {
      return NextResponse.json(
        { error: "Campaign ID is required" },
        { status: 400 }
      )
    }

    const result = await sendCampaign(campaignId)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error("Send campaign error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send campaign" },
      { status: 500 }
    )
  }
}
export const POST=wrapAdmission(POSTHandler,'src/app/api/newsletter/send/route.ts'+':POST',3000);
