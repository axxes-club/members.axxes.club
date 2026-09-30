import { NextResponse, type NextRequest } from "next/server"
import { auth, HANDSHAKE_URL } from "@/lib/auth"

// Ends the session: through Handshake (all AXXES apps) when it's on, otherwise just here.
//
// Local hosts are excluded for the same reason the middleware excludes them:
// bouncing sign-out to a second app on localhost means signing out here can
// silently leave you signed in there, or land you back on a sign-in screen for
// an app you were not using. Locally, sign out of this app and be done.
export async function GET(req: NextRequest) {
  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "[::1]"])
  const isLocalHost = localHosts.has(req.nextUrl.hostname)

  if (HANDSHAKE_URL && !isLocalHost) {
    const back = new URL("/dashboard", req.url).href
    return NextResponse.redirect(`${HANDSHAKE_URL}/sign-out?redirect=${encodeURIComponent(back)}`)
  }

  const result = await auth.api.signOut({ headers: req.headers, asResponse: true }).catch(() => null)
  const res = NextResponse.redirect(new URL("/sign-in", req.url))
  result?.headers.getSetCookie().forEach((cookie) => res.headers.append("set-cookie", cookie))
  res.cookies.delete("tenant_id")
  return res
}
