import { NextRequest, NextResponse } from "next/server"
import { validateInviteCode } from "@/lib/actions/admin"

export async function POST(request: NextRequest) {
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
