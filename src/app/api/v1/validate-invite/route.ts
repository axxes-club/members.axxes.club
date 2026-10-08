import {wrapAdmission} from '@/lib/security/admission-server';
import { NextRequest, NextResponse } from "next/server"
import { validateInviteCode } from "@/lib/actions/admin"

async function POSTHandler(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { valid: false, error: "Invite code is required" },
        { status: 400 }
      )
    }

    const result = await validateInviteCode(code)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Failed to validate invite code:", error)
    return NextResponse.json(
      { valid: false, error: "Failed to validate invite code" },
      { status: 500 }
    )
  }
}

export const POST=wrapAdmission(POSTHandler,'src/app/api/v1/validate-invite/route.ts'+':POST',3000);
