import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Prefix-matched, so every entry must end at a segment boundary. "/" is NOT
// usable here: pathname.startsWith("/") is true for every route in the app, so
// listing it made this check match everything and return NextResponse.next()
// before the session and tenant guards below ever ran. The root is public, but
// it is matched exactly instead.
//
// Because that bug let everything through, the password and invite routes were
// never listed here even though they are public. They are now, explicitly: they
// are the pages a signed-out person has to be able to reach.
const publicRoutes = [
  "/sign-in",
  "/sign-up",
  "/sign-out",
  "/forgot-password",
  "/reset-password",
  "/accept-invite",
  "/api/auth",
  "/p/",
  "/api/dev-auth",
  "/share/",
  "/api/uploadthing",
]

// Auth pages that move to Handshake (the central AXXES account) when it's switched on
const handshakePages: Record<string, string> = {
  "/sign-in": "/sign-in",
  "/sign-up": "/sign-up",
  "/forgot-password": "/forgot-password",
  "/reset-password": "/forgot-password",
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // A path is public if it is the root, or if it sits under one of the prefixes.
  const isPublic = pathname === "/" || publicRoutes.some((route) => pathname.startsWith(route))

  // ── Handshake hand-off ──
  //
  // In production, sign-in happens once on Handshake and every *.axxes.club app
  // shares that session. That is the whole reason this redirect exists.
  //
  // Locally it is actively harmful. Both apps sit on `localhost`, so the
  // cross-app hand-off depends on a secret, a registered OIDC callback and a
  // cookie surviving an origin change — and when any of it is off, the person
  // who just typed a correct password lands back on a sign-in screen with no
  // error, which is indistinguishable from being told their account is broken.
  // LOCAL-TESTING.md already documents this as a known dead end.
  //
  // So the hand-off is skipped on a local host, where there is no subdomain
  // federation to solve in the first place, and this app's own sign-in form is
  // both sufficient and self-consistent. Keyed on the request host rather than
  // NODE_ENV, so a production-shaped local run (`NODE_ENV=production` on
  // localhost) behaves the same way, and a real deployment is untouched.
  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "[::1]"])
  const isLocalHost = localHosts.has(request.nextUrl.hostname)

  const handshakeUrl = isLocalHost
    ? null
    : process.env.HANDSHAKE_URL?.replace(/\/$/, "")

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
  if (isPublic) {
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

  // Endpoints whose entire job is to CHOOSE a workspace.
  //
  // These must be reachable before a tenant_id cookie exists. They were not,
  // and that deadlocked anyone returning to the portal without the cookie: the
  // middleware sent GET /api/v1/tenants to /onboarding, the onboarding page
  // fetched that URL and got HTML instead of JSON, so it rendered with an empty
  // list and offered nothing but "create a business" — while the one call that
  // would have fixed it, POST /api/v1/tenants/select, was redirected to the
  // same dead page. There was no way out that did not involve inventing a
  // throwaway workspace.
  //
  // They stay BELOW the session check above: you still have to be signed in to
  // list or pick a workspace, this only exempts them from the tenant guard.
  const tenantSelectionRoutes = ["/api/v1/tenants"]

  // Check for tenant ID cookie
  const tenantId = request.cookies.get("tenant_id")?.value
  const isSelectingTenant = tenantSelectionRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  // Redirect to onboarding if no tenant.
  //
  // The target is the auto-select route, not /onboarding itself. It resolves
  // the member's own primary membership, sets the cookie and forwards to where
  // they were actually going, so a returning member never sees the workspace
  // picker. Somebody with no membership at all is forwarded to /onboarding,
  // where the picker (and "create a business") is the correct thing to show.
  if (!tenantId && !isSelectingTenant && !pathname.startsWith("/onboarding")) {
    const autoSelect = new URL("/api/v1/tenants/select", request.url)
    autoSelect.searchParams.set("next", pathname)
    return NextResponse.redirect(autoSelect)
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
