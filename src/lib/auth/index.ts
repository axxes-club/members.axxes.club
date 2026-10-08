import {admitAction} from "@/lib/security/admission-server";
import {guardPlatformAuth,platformAccessAllowed} from '@/lib/platform-access';
import {resolveEligibleOrganization} from '@/lib/platform-access-core';
import {APIError} from 'better-auth/api';
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "@/lib/db"
import { loginActivity, tenantMemberships, tenants } from "@/lib/db/schema"
import { and, asc, desc, eq, isNull } from "drizzle-orm"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { sendPasswordResetEmail } from "@/lib/email"
import { rawCookieHeader } from "@/lib/auth/raw-cookie"

// With Handshake (handshake.axxes.club), every *.axxes.club app shares one session cookie
const cookieDomain = process.env.AUTH_COOKIE_DOMAIN
const parentDomain = (cookieDomain || "axxes.club").replace(/^\./, "")

/**
 * Extra origins, for running against a Handshake on your own machine.
 *
 * Without this, `next dev` cannot complete a sign-in: the callback comes back
 * from `http://localhost:3101`, which matches neither `https://axxes.club` nor
 * `https://*.axxes.club`, so Better Auth rejects it as an untrusted origin and
 * you land back on the sign-in page with no error explaining why.
 *
 * The list is opt-in through EXTRA_TRUSTED_ORIGINS and is empty by default,
 * so production keeps trusting exactly the real domains and nothing else.
 * Handshake must be listed here too, not just this app: it is the one issuing
 * the callback.
 */
const extraOrigins = (process.env.EXTRA_TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

const trustedOrigins = [
  `https://${parentDomain}`,
  `https://*.${parentDomain}`,
  ...extraOrigins,
]

// Central AXXES sign-in; when unset the portal uses its own sign-in pages
export const HANDSHAKE_URL = process.env.HANDSHAKE_URL?.replace(/\/$/, "") || null

const baseAuth = betterAuth({
  baseURL: process.env.BETTER_AUTH_BASE_URL || "http://localhost:3000",
  trustedOrigins,
  advanced: cookieDomain ? { crossSubDomainCookies: { enabled: true, domain: cookieDomain } } : undefined,
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  // Shared identity enrollment is controlled by Handshake invite creation.
  disabledPaths: ["/sign-up/email"],
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        email: user.email,
        resetLink: url,
      })
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => { if(!await platformAccessAllowed(session.userId)) throw new APIError('FORBIDDEN',{message:'Account access is suspended.'}); return {data:session}; },
        after: async (session) => {
          // Log login event when a new session is created
          try {
            await db.insert(loginActivity).values({
              userId: session.userId,
              eventType: "login",
              ipAddress: session.ipAddress || null,
              userAgent: session.userAgent || null,
              metadata: {},
            })
          } catch (error) {
            // Don't fail auth if logging fails
            console.error("Failed to log login activity:", error)
          }
        },
      },
    },
  },
})

export const auth = guardPlatformAuth(baseAuth);

export async function getAuthContext() {
  const cookieStore = await cookies()
  const tenantId = cookieStore.get("tenant_id")?.value

  // Build cookie header string from all cookies
  const cookieHeader = await rawCookieHeader()

  // Get session from Better Auth
  const session = await auth.api.getSession({
    headers: new Headers({
      cookie: cookieHeader,
    }),
  })

  if (!session?.user) {
    redirect("/sign-in")
  }

  // The cookie names WHICH workspace you are looking at. It is not proof that
  // you belong to one, so it is verified here rather than trusted — a
  // hand-edited cookie must not be a key to somebody else's tenant.
  //
  // When it is absent, fall back to a real membership instead of bouncing to
  // onboarding. Without this, a returning member with a perfectly good account
  // was sent to the "create a business" screen every time the cookie lapsed,
  // which reads as "you have no account" to somebody who is signed in. Only a
  // user with NO membership at all still belongs in onboarding.
  let resolvedTenantId = tenantId
  if (tenantId) {
    const member = await db
      .select({ id: tenantMemberships.id })
      .from(tenantMemberships)
      .innerJoin(tenants,eq(tenants.id,tenantMemberships.tenantId))
      .where(
        and(
          eq(tenantMemberships.tenantId, tenantId),
          eq(tenantMemberships.userId, session.user.id),
          isNull(tenantMemberships.deletedAt),
          isNull(tenants.deletedAt),eq(tenants.status,"active"),
        ),
      )
      .limit(1)
    if (!member.length) resolvedTenantId = undefined
  }

  if(resolvedTenantId&&!await platformAccessAllowed(session.user.id,resolvedTenantId))resolvedTenantId=undefined;
  if (!resolvedTenantId) {
    // is_primary is not unique in the schema, and in this database it is not
    // unique in practice, so the earliest membership breaks the tie rather than
    // trusting a flag that can legitimately be true twice.
    const memberships = await db
      .select({ tenantId: tenantMemberships.tenantId })
      .from(tenantMemberships)
      .innerJoin(tenants,eq(tenants.id,tenantMemberships.tenantId))
      .where(and(eq(tenantMemberships.userId, session.user.id),isNull(tenantMemberships.deletedAt),isNull(tenants.deletedAt),eq(tenants.status,"active")))
      .orderBy(desc(tenantMemberships.isPrimary), asc(tenantMemberships.joinedAt))
      .limit(1000)
    const choice=await resolveEligibleOrganization(memberships,undefined,id=>platformAccessAllowed(session.user.id,id));
    if(choice.state==='onboarding')redirect('/onboarding');
    if(choice.state==='denied')redirect('/access-denied');
    resolvedTenantId=choice.organizationId!;
  }

  if (!await platformAccessAllowed(session.user.id, resolvedTenantId)) redirect('/onboarding');
  await admitAction(session.user.id,resolvedTenantId);
  return { userId: session.user.id, tenantId: resolvedTenantId }
}

export type Session = typeof auth.$Infer.Session
