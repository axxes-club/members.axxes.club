"use server"

import { db } from "@/lib/db"
import { socialAccounts, socialPosts } from "@/lib/db/schema"
import { eq, and, desc, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getAuthContext } from "@/lib/auth"

const postSchema = z.object({
  content: z.string().optional(),
  socialAccountId: z.string().min(1, "Social account is required"),
  mediaType: z.enum(["image", "video", "carousel", "story", "reel"]).optional(),
  mediaUrls: z.array(z.string()).optional(),
  status: z.enum(["draft", "scheduled", "published", "failed", "deleted"]).optional(),
  scheduledFor: z.string().optional(),
  eventId: z.string().optional(),
  productId: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  mentions: z.array(z.string()).optional(),
  locationName: z.string().optional(),
})

export type PostFormData = z.infer<typeof postSchema>

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

// Full Posts CRUD
export async function getPosts({
  filter = "all",
  page = 1,
  limit = 20,
}: {
  filter?: "all" | "draft" | "scheduled" | "published" | "failed"
  page?: number
  limit?: number
} = {}) {
  const { tenantId } = await getTenantId()

  const conditions = [
    eq(socialPosts.tenantId, tenantId),
    sql`${socialPosts.deletedAt} IS NULL`,
  ]

  if (filter !== "all") {
    conditions.push(eq(socialPosts.status, filter))
  }

  const [postList, countResult] = await Promise.all([
    db.query.socialPosts.findMany({
      where: and(...conditions),
      with: {
        socialAccount: true,
        event: true,
        product: true,
      },
      orderBy: [desc(socialPosts.createdAt)],
      limit,
      offset: (page - 1) * limit,
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(socialPosts)
      .where(and(...conditions)),
  ])

  return {
    posts: postList,
    total: Number(countResult[0].count),
    page,
    limit,
    totalPages: Math.ceil(Number(countResult[0].count) / limit),
  }
}

export async function getPost(id: string) {
  const { tenantId } = await getTenantId()

  const post = await db.query.socialPosts.findFirst({
    where: and(
      eq(socialPosts.id, id),
      eq(socialPosts.tenantId, tenantId),
      sql`${socialPosts.deletedAt} IS NULL`
    ),
    with: {
      socialAccount: true,
      event: true,
      product: true,
      analytics: {
        orderBy: [desc(sql`recorded_at`)],
        limit: 1,
      },
    },
  })

  if (!post) {
    throw new Error("Post not found")
  }

  return post
}

export async function createPost(data: PostFormData) {
  const { tenantId, userId } = await getTenantId()

  const parsed = postSchema.parse(data)

  const [post] = await db
    .insert(socialPosts)
    .values({
      tenantId,
      socialAccountId: parsed.socialAccountId,
      content: parsed.content || null,
      mediaType: parsed.mediaType || null,
      mediaUrls: parsed.mediaUrls || [],
      status: parsed.status || "draft",
      scheduledFor: parsed.scheduledFor ? new Date(parsed.scheduledFor) : null,
      eventId: parsed.eventId || null,
      productId: parsed.productId || null,
      hashtags: parsed.hashtags || [],
      mentions: parsed.mentions || [],
      locationName: parsed.locationName || null,
      createdById: userId,
    })
    .returning()

  revalidatePath("/social/posts")
  return post
}

export async function updatePost(id: string, data: Partial<PostFormData>) {
  const { tenantId } = await getTenantId()

  const [post] = await db
    .update(socialPosts)
    .set({
      ...data,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(socialPosts.id, id),
        eq(socialPosts.tenantId, tenantId)
      )
    )
    .returning()

  if (!post) {
    throw new Error("Post not found")
  }

  revalidatePath("/social/posts")
  revalidatePath(`/social/posts/${id}`)
  return post
}

export async function deletePost(id: string) {
  const { tenantId } = await getTenantId()

  await db
    .update(socialPosts)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(socialPosts.id, id),
        eq(socialPosts.tenantId, tenantId)
      )
    )

  revalidatePath("/social/posts")
}

export async function publishPost(id: string) {
  const { tenantId } = await getTenantId()

  const [post] = await db
    .update(socialPosts)
    .set({
      status: "published",
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(socialPosts.id, id),
        eq(socialPosts.tenantId, tenantId)
      )
    )
    .returning()

  if (!post) {
    throw new Error("Post not found")
  }

  revalidatePath("/social/posts")
  revalidatePath(`/social/posts/${id}`)
  return post
}

export async function schedulePost(id: string, scheduledFor: string) {
  const { tenantId } = await getTenantId()

  const [post] = await db
    .update(socialPosts)
    .set({
      status: "scheduled",
      scheduledFor: new Date(scheduledFor),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(socialPosts.id, id),
        eq(socialPosts.tenantId, tenantId)
      )
    )
    .returning()

  if (!post) {
    throw new Error("Post not found")
  }

  revalidatePath("/social/posts")
  revalidatePath(`/social/posts/${id}`)
  return post
}

export async function getPostStats() {
  const { tenantId } = await getTenantId()

  const [total, drafts, scheduled, published, failed] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(socialPosts)
      .where(
        and(
          eq(socialPosts.tenantId, tenantId),
          sql`${socialPosts.deletedAt} IS NULL`
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(socialPosts)
      .where(
        and(
          eq(socialPosts.tenantId, tenantId),
          eq(socialPosts.status, "draft"),
          sql`${socialPosts.deletedAt} IS NULL`
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(socialPosts)
      .where(
        and(
          eq(socialPosts.tenantId, tenantId),
          eq(socialPosts.status, "scheduled"),
          sql`${socialPosts.deletedAt} IS NULL`
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(socialPosts)
      .where(
        and(
          eq(socialPosts.tenantId, tenantId),
          eq(socialPosts.status, "published"),
          sql`${socialPosts.deletedAt} IS NULL`
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(socialPosts)
      .where(
        and(
          eq(socialPosts.tenantId, tenantId),
          eq(socialPosts.status, "failed"),
          sql`${socialPosts.deletedAt} IS NULL`
        )
      ),
  ])

  return {
    total: Number(total[0].count),
    drafts: Number(drafts[0].count),
    scheduled: Number(scheduled[0].count),
    published: Number(published[0].count),
    failed: Number(failed[0].count),
  }
}

// Social Account CRUD
export async function getSocialAccount(id: string) {
  const { tenantId } = await getTenantId()

  const account = await db.query.socialAccounts.findFirst({
    where: and(
      eq(socialAccounts.id, id),
      eq(socialAccounts.tenantId, tenantId),
      sql`${socialAccounts.deletedAt} IS NULL`
    ),
    with: {
      posts: {
        where: sql`${socialPosts.deletedAt} IS NULL`,
        orderBy: [desc(socialPosts.createdAt)],
        limit: 10,
      },
    },
  })

  if (!account) {
    throw new Error("Social account not found")
  }

  return account
}

export async function deleteSocialAccount(id: string) {
  const { tenantId } = await getTenantId()

  await db
    .update(socialAccounts)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(socialAccounts.id, id),
        eq(socialAccounts.tenantId, tenantId)
      )
    )

  revalidatePath("/social")
}
