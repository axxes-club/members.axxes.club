"use server"

import { db } from "@/lib/db"
import { socialAccounts, socialPosts } from "@/lib/db/schema"
import { eq, and, desc, sql } from "drizzle-orm"
import { getAuthContext } from "@/lib/auth"

async function getTenantId() {
  return getAuthContext()
}

export async function getSocialAccounts() {
  const { tenantId } = await getTenantId()

  return db.query.socialAccounts.findMany({
    where: and(
      eq(socialAccounts.tenantId, tenantId),
      sql`${socialAccounts.deletedAt} IS NULL`
    ),
    orderBy: [desc(socialAccounts.createdAt)],
  })
}

export async function getSocialStats() {
  const { tenantId } = await getTenantId()

  const [totalAccounts, totalPosts, totalFollowers] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(socialAccounts)
      .where(
        and(
          eq(socialAccounts.tenantId, tenantId),
          sql`${socialAccounts.deletedAt} IS NULL`
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(socialPosts)
      .where(eq(socialPosts.tenantId, tenantId)),
    db
      .select({ total: sql<number>`COALESCE(SUM(${socialAccounts.followersCount}), 0)` })
      .from(socialAccounts)
      .where(
        and(
          eq(socialAccounts.tenantId, tenantId),
          sql`${socialAccounts.deletedAt} IS NULL`
        )
      ),
  ])

  return {
    totalAccounts: Number(totalAccounts[0].count),
    totalPosts: Number(totalPosts[0].count),
    totalFollowers: Number(totalFollowers[0].total),
  }
}

export async function getScheduledPosts() {
  const { tenantId } = await getTenantId()

  return db.query.socialPosts.findMany({
    where: and(
      eq(socialPosts.tenantId, tenantId),
      eq(socialPosts.status, "scheduled")
    ),
    orderBy: [desc(socialPosts.scheduledFor)],
    limit: 10,
  })
}
