import {wrapAdmission} from '@/lib/security/admission-server';
import { NextRequest, NextResponse } from "next/server"
import { consumeInviteCode } from "@/lib/actions/admin"

async function POSTHandler(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { success: false, error: "Invite code is required" },
        { status: 400 }
      )
    }

    await consumeInviteCode(code)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to use invite code:", error)
    return NextResponse.json(
      { success: false, error: "Failed to use invite code" },
      { status: 500 }
    )
  }
}

export const POST=wrapAdmission(POSTHandler,'src/app/api/v1/use-invite/route.ts'+':POST',3000);
