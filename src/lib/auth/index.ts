import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "@/lib/db"
import { cookies } from "next/headers"

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_BASE_URL || "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
})

export async function getAuthContext() {
  const cookieStore = await cookies()
  const tenantId = cookieStore.get("tenant_id")?.value

  // Build cookie header string from all cookies
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ")

  // Get session from Better Auth
  const session = await auth.api.getSession({
    headers: new Headers({
      cookie: cookieHeader,
    }),
  })

  if (!session?.user) throw new Error("Unauthorized")
  if (!tenantId) throw new Error("No tenant selected")

  return { userId: session.user.id, tenantId }
}

export type Session = typeof auth.$Infer.Session
