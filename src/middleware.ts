import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const publicRoutes = ["/", "/sign-in", "/sign-up", "/sign-out", "/api/auth", "/p/", "/api/dev-auth", "/share/", "/api/uploadthing"]

// Auth pages that move to Handshake (the central AXXES account) when it's switched on
const handshakePages: Record<string, string> = {
  "/sign-in": "/sign-in",
  "/sign-up": "/sign-up",
  "/forgot-password": "/forgot-password",
  "/reset-password": "/forgot-password",
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  const handshakeUrl = process.env.HANDSHAKE_URL?.replace(/\/$/, "")
  if (handshakeUrl && handshakePages[pathname]) {
    const back = new URL(searchParams.get("redirect") || "/dashboard", request.url)
    if (back.origin !== request.nextUrl.origin) back.href = new URL("/dashboard", request.url).href
    const target = new URL(`${handshakeUrl}${handshakePages[pathname]}`)
    target.searchParams.set("redirect", back.href)
    return NextResponse.redirect(target)
  }

  // Handle dev auth bypass: /?devauth or /sign-in?devauth
  if (searchParams.has("devauth")) {
    const devAuthUrl = new URL("/api/dev-auth", request.url)
    // Preserve redirect param if present
    const redirect = searchParams.get("redirect")
    if (redirect) {
      devAuthUrl.searchParams.set("redirect", redirect)
    }
    return NextResponse.redirect(devAuthUrl)
  }

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check for auth session cookie (Better Auth uses 'better-auth.session_token')
  const sessionToken = request.cookies.get("better-auth.session_token")?.value

  // Redirect to sign-in if not authenticated
  if (!sessionToken) {
    const signInUrl = new URL("/sign-in", request.url)
    signInUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Check for tenant ID cookie
  const tenantId = request.cookies.get("tenant_id")?.value

  // Redirect to onboarding if no tenant
  if (!tenantId && !pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/onboarding", request.url))
  }

  // Already onboarded, skip onboarding
  if (tenantId && pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
}
