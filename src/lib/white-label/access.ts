import {platformAccessAllowed} from '@/lib/platform-access';
import "server-only"
import { and, eq, isNull } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { tenantMemberships, user } from "@/lib/db/schema"
import { AXXES_STAFF_TENANT_ID } from "./config"
import { rawCookieHeader } from "@/lib/auth/raw-cookie"

/**
 * Who may provision and configure white-label customers: anyone in the AXXES
 * CLUB organization, plus AXXES superadmins. Returns null for everyone else.
 */
export async function getAxxesStaff(): Promise<{ userId: string; name: string } | null> {
  const cookieHeader = await rawCookieHeader()
  const session = await auth.api.getSession({ headers: new Headers({ cookie: cookieHeader }) })
  if (!session?.user) return null

  const dbUser = await db.query.user.findFirst({ where: eq(user.id, session.user.id) })
  if (!dbUser) return null
  if (dbUser.isSuperadmin) return { userId: dbUser.id, name: dbUser.name }

  const membership = await db.query.tenantMemberships.findFirst({
    where: and(
      eq(tenantMemberships.tenantId, AXXES_STAFF_TENANT_ID),
      eq(tenantMemberships.userId, dbUser.id),
      isNull(tenantMemberships.deletedAt)
    ),
  })
  if(membership&&!await platformAccessAllowed(dbUser.id,AXXES_STAFF_TENANT_ID))return null;
  return membership ? { userId: dbUser.id, name: dbUser.name } : null
}

/** For server actions: throws unless the caller is AXXES staff. */
export async function requireAxxesStaff() {
  const staff = await getAxxesStaff()
  if (!staff) throw new Error("Only AXXES staff can manage white-label customers.")
  return staff
}
