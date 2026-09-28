import { NextResponse, type NextRequest } from "next/server"
import { auth, HANDSHAKE_URL } from "@/lib/auth"

// Ends the session: through Handshake (all AXXES apps) when it's on, otherwise just here
export async function GET(req: NextRequest) {
  if (HANDSHAKE_URL) {
    const back = new URL("/dashboard", req.url).href
    return NextResponse.redirect(`${HANDSHAKE_URL}/sign-out?redirect=${encodeURIComponent(back)}`)
  }

  const result = await auth.api.signOut({ headers: req.headers, asResponse: true }).catch(() => null)
  const res = NextResponse.redirect(new URL("/sign-in", req.url))
  result?.headers.getSetCookie().forEach((cookie) => res.headers.append("set-cookie", cookie))
  res.cookies.delete("tenant_id")
  return res
}
