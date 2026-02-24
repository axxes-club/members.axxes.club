"use server"

import { revalidatePath } from "next/cache"
import { eq, and, desc, inArray, sql, isNull } from "drizzle-orm"
import { nanoid } from "nanoid"
import { db } from "@/lib/db"
import { getAuthContext } from "@/lib/auth"
import {
  subscriberLists,
  listMemberships,
  emailTemplates,
  newsletterCampaigns,
  newsletterSends,
  newsletterEvents,
  newsletterSettings,
  trackedLinks,
  contacts,
  type NewSubscriberList,
  type NewEmailTemplate,
  type NewNewsletterCampaign,
  type NewNewsletterSettings,
} from "@/lib/db/schema"
import { z } from "zod"

// ============================================
// Subscriber Lists
// ============================================

const createListSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  type: z.enum(["public", "private"]).default("public"),
  doubleOptIn: z.boolean().default(true),
})

export async function createSubscriberList(data: z.infer<typeof createListSchema>) {
  const { tenantId, userId } = await getAuthContext()

  const validated = createListSchema.parse(data)

  // Check if slug already exists for this tenant
  const existing = await db.query.subscriberLists.findFirst({
    where: and(
      eq(subscriberLists.tenantId, tenantId),
      eq(subscriberLists.slug, validated.slug),
      isNull(subscriberLists.deletedAt)
    ),
  })

  if (existing) {
    throw new Error("A list with this slug already exists")
  }

  const [list] = await db.insert(subscriberLists).values({
    ...validated,
    tenantId,
  }).returning()

  revalidatePath("/newsletter/lists")
  return list
}

export async function updateSubscriberList(id: string, data: Partial<z.infer<typeof createListSchema>>) {
  const { tenantId } = await getAuthContext()

  const [list] = await db
    .update(subscriberLists)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(subscriberLists.id, id), eq(subscriberLists.tenantId, tenantId)))
    .returning()

  if (!list) {
    throw new Error("List not found")
  }

  revalidatePath("/newsletter/lists")
  return list
}

export async function deleteSubscriberList(id: string) {
  const { tenantId } = await getAuthContext()

  const [list] = await db
    .update(subscriberLists)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(subscriberLists.id, id), eq(subscriberLists.tenantId, tenantId)))
    .returning()

  if (!list) {
    throw new Error("List not found")
  }

  revalidatePath("/newsletter/lists")
  return list
}

export async function getSubscriberLists() {
  const { tenantId } = await getAuthContext()

  const lists = await db.query.subscriberLists.findMany({
    where: and(eq(subscriberLists.tenantId, tenantId), isNull(subscriberLists.deletedAt)),
    orderBy: [desc(subscriberLists.createdAt)],
  })

  return lists
}

export async function getSubscriberList(id: string) {
  const { tenantId } = await getAuthContext()

  const list = await db.query.subscriberLists.findFirst({
    where: and(eq(subscriberLists.id, id), eq(subscriberLists.tenantId, tenantId), isNull(subscriberLists.deletedAt)),
    with: {
      memberships: {
        where: eq(listMemberships.status, "subscribed"),
        with: {
          contact: true,
        },
      },
    },
  })

  return list
}

// ============================================
// List Memberships / Subscribers
// ============================================

export async function addContactToList(contactId: string, listId: string, source = "manual") {
  const { tenantId } = await getAuthContext()

  // Verify list belongs to tenant
  const list = await db.query.subscriberLists.findFirst({
    where: and(eq(subscriberLists.id, listId), eq(subscriberLists.tenantId, tenantId), isNull(subscriberLists.deletedAt)),
  })

  if (!list) {
    throw new Error("List not found")
  }

  // Check if already subscribed
  const existing = await db.query.listMemberships.findFirst({
    where: and(eq(listMemberships.listId, listId), eq(listMemberships.contactId, contactId)),
  })

  if (existing) {
    if (existing.status === "subscribed") {
      throw new Error("Contact is already subscribed to this list")
    }
    // Re-subscribe
    const [membership] = await db
      .update(listMemberships)
      .set({
        status: list.doubleOptIn ? "pending" : "subscribed",
        subscribedAt: new Date(),
        unsubscribedAt: null,
        unsubscribeReason: null,
        source,
        optInToken: list.doubleOptIn ? nanoid(32) : null,
        updatedAt: new Date(),
      })
      .where(eq(listMemberships.id, existing.id))
      .returning()

    // Update subscriber count
    await updateSubscriberCount(listId)
    return membership
  }

  // Create new membership
  const [membership] = await db.insert(listMemberships).values({
    listId,
    contactId,
    status: list.doubleOptIn ? "pending" : "subscribed",
    source,
    optInToken: list.doubleOptIn ? nanoid(32) : null,
  }).returning()

  // Update subscriber count
  await updateSubscriberCount(listId)

  return membership
}

export async function removeContactFromList(contactId: string, listId: string, reason?: string) {
  const { tenantId } = await getAuthContext()

  const [membership] = await db
    .update(listMemberships)
    .set({
      status: "unsubscribed",
      unsubscribedAt: new Date(),
      unsubscribeReason: reason,
      updatedAt: new Date(),
    })
    .where(and(eq(listMemberships.listId, listId), eq(listMemberships.contactId, contactId)))
    .returning()

  if (membership) {
    await updateSubscriberCount(listId)
  }

  revalidatePath("/newsletter/lists")
  return membership
}

export async function confirmOptIn(token: string) {
  const membership = await db.query.listMemberships.findFirst({
    where: eq(listMemberships.optInToken, token),
    with: { list: true },
  })

  if (!membership) {
    throw new Error("Invalid or expired opt-in token")
  }

  const [updated] = await db
    .update(listMemberships)
    .set({
      status: "subscribed",
      optInConfirmedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(listMemberships.id, membership.id))
    .returning()

  await updateSubscriberCount(membership.listId)

  return { membership: updated, list: membership.list }
}

async function updateSubscriberCount(listId: string) {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listMemberships)
    .where(and(eq(listMemberships.listId, listId), eq(listMemberships.status, "subscribed")))

  const count = result[0]?.count ?? 0

  await db.update(subscriberLists).set({ subscriberCount: count }).where(eq(subscriberLists.id, listId))
}

// ============================================
// Email Templates
// ============================================

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  subject: z.string().min(1),
  htmlContent: z.string().min(1),
  textContent: z.string().optional(),
  type: z.enum(["campaign", "welcome", "transactional"]).default("campaign"),
  fromName: z.string().optional(),
  fromEmail: z.string().email().optional().or(z.string().length(0)),
  replyTo: z.string().email().optional().or(z.string().length(0)),
})

export async function createEmailTemplate(data: z.infer<typeof createTemplateSchema>) {
  const { tenantId } = await getAuthContext()

  const validated = createTemplateSchema.parse(data)

  const [template] = await db.insert(emailTemplates).values({
    ...validated,
    tenantId,
  }).returning()

  revalidatePath("/newsletter/templates")
  return template
}

export async function updateEmailTemplate(id: string, data: Partial<z.infer<typeof createTemplateSchema>>) {
  const { tenantId } = await getAuthContext()

  const [template] = await db
    .update(emailTemplates)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(emailTemplates.id, id), eq(emailTemplates.tenantId, tenantId)))
    .returning()

  if (!template) {
    throw new Error("Template not found")
  }

  revalidatePath("/newsletter/templates")
  return template
}

export async function deleteEmailTemplate(id: string) {
  const { tenantId } = await getAuthContext()

  const [template] = await db
    .update(emailTemplates)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(emailTemplates.id, id), eq(emailTemplates.tenantId, tenantId)))
    .returning()

  if (!template) {
    throw new Error("Template not found")
  }

  revalidatePath("/newsletter/templates")
  return template
}

export async function getEmailTemplates() {
  const { tenantId } = await getAuthContext()

  const templates = await db.query.emailTemplates.findMany({
    where: and(eq(emailTemplates.tenantId, tenantId), isNull(emailTemplates.deletedAt)),
    orderBy: [desc(emailTemplates.createdAt)],
  })

  return templates
}

export async function getEmailTemplate(id: string) {
  const { tenantId } = await getAuthContext()

  const template = await db.query.emailTemplates.findFirst({
    where: and(eq(emailTemplates.id, id), eq(emailTemplates.tenantId, tenantId), isNull(emailTemplates.deletedAt)),
  })

  return template
}

// ============================================
// Campaigns
// ============================================

const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1),
  previewText: z.string().optional(),
  htmlContent: z.string().optional(),
  textContent: z.string().optional(),
  templateId: z.string().uuid().optional().or(z.string().length(0)),
  fromName: z.string().optional(),
  fromEmail: z.string().email().optional().or(z.string().length(0)),
  replyTo: z.string().email().optional().or(z.string().length(0)),
  listIds: z.array(z.string().uuid()).optional(),
  segmentIds: z.array(z.string().uuid()).optional(),
  trackingEnabled: z.boolean().default(true),
  clickTrackingEnabled: z.boolean().default(true),
  openTrackingEnabled: z.boolean().default(true),
})

export async function createCampaign(data: z.infer<typeof createCampaignSchema>) {
  const { tenantId, userId } = await getAuthContext()

  const validated = createCampaignSchema.parse(data)

  const [campaign] = await db.insert(newsletterCampaigns).values({
    ...validated,
    tenantId,
    createdById: userId,
    listIds: validated.listIds ?? [],
    segmentIds: validated.segmentIds ?? [],
  }).returning()

  revalidatePath("/newsletter/campaigns")
  return campaign
}

export async function updateCampaign(id: string, data: Partial<z.infer<typeof createCampaignSchema>>) {
  const { tenantId } = await getAuthContext()

  // Don't allow editing sent campaigns
  const existing = await db.query.newsletterCampaigns.findFirst({
    where: and(eq(newsletterCampaigns.id, id), eq(newsletterCampaigns.tenantId, tenantId)),
  })

  if (!existing) {
    throw new Error("Campaign not found")
  }

  if (existing.status === "sent" || existing.status === "sending") {
    throw new Error("Cannot edit a campaign that is sending or has been sent")
  }

  const [campaign] = await db
    .update(newsletterCampaigns)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(newsletterCampaigns.id, id), eq(newsletterCampaigns.tenantId, tenantId)))
    .returning()

  revalidatePath("/newsletter/campaigns")
  return campaign
}

export async function deleteCampaign(id: string) {
  const { tenantId } = await getAuthContext()

  const [campaign] = await db
    .update(newsletterCampaigns)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(newsletterCampaigns.id, id), eq(newsletterCampaigns.tenantId, tenantId)))
    .returning()

  if (!campaign) {
    throw new Error("Campaign not found")
  }

  revalidatePath("/newsletter/campaigns")
  return campaign
}

export async function getCampaigns() {
  const { tenantId } = await getAuthContext()

  const campaigns = await db.query.newsletterCampaigns.findMany({
    where: and(eq(newsletterCampaigns.tenantId, tenantId), isNull(newsletterCampaigns.deletedAt)),
    orderBy: [desc(newsletterCampaigns.createdAt)],
    with: {
      template: true,
      createdBy: true,
    },
  })

  return campaigns
}

export async function getCampaign(id: string) {
  const { tenantId } = await getAuthContext()

  const campaign = await db.query.newsletterCampaigns.findFirst({
    where: and(eq(newsletterCampaigns.id, id), eq(newsletterCampaigns.tenantId, tenantId), isNull(newsletterCampaigns.deletedAt)),
    with: {
      template: true,
      createdBy: true,
      sends: {
        limit: 100,
        orderBy: [desc(newsletterSends.createdAt)],
      },
    },
  })

  return campaign
}

export async function scheduleCampaign(id: string, scheduledAt: Date) {
  const { tenantId } = await getAuthContext()

  const [campaign] = await db
    .update(newsletterCampaigns)
    .set({
      status: "scheduled",
      scheduledAt,
      updatedAt: new Date(),
    })
    .where(and(eq(newsletterCampaigns.id, id), eq(newsletterCampaigns.tenantId, tenantId), eq(newsletterCampaigns.status, "draft")))
    .returning()

  if (!campaign) {
    throw new Error("Campaign not found or cannot be scheduled")
  }

  revalidatePath("/newsletter/campaigns")
  return campaign
}

export async function cancelScheduledCampaign(id: string) {
  const { tenantId } = await getAuthContext()

  const [campaign] = await db
    .update(newsletterCampaigns)
    .set({
      status: "cancelled",
      scheduledAt: null,
      updatedAt: new Date(),
    })
    .where(and(eq(newsletterCampaigns.id, id), eq(newsletterCampaigns.tenantId, tenantId), eq(newsletterCampaigns.status, "scheduled")))
    .returning()

  if (!campaign) {
    throw new Error("Campaign not found or cannot be cancelled")
  }

  revalidatePath("/newsletter/campaigns")
  return campaign
}

// ============================================
// Newsletter Settings
// ============================================

const updateSettingsSchema = z.object({
  emailProvider: z.enum(["smtp", "resend", "sendgrid", "mailgun"]).optional(),
  defaultFromName: z.string().optional(),
  defaultFromEmail: z.string().email().optional().or(z.string().length(0)),
  defaultReplyTo: z.string().email().optional().or(z.string().length(0)),
  resendApiKey: z.string().optional(),
  sendgridApiKey: z.string().optional(),
  mailgunApiKey: z.string().optional(),
  mailgunDomain: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpSecure: z.boolean().optional(),
  openTrackingEnabled: z.boolean().optional(),
  clickTrackingEnabled: z.boolean().optional(),
  logoUrl: z.string().url().optional().or(z.string().length(0)),
  brandColor: z.string().optional(),
})

export async function getNewsletterSettings() {
  const { tenantId } = await getAuthContext()

  let settings = await db.query.newsletterSettings.findFirst({
    where: eq(newsletterSettings.tenantId, tenantId),
  })

  // Create default settings if not exists
  if (!settings) {
    const [newSettings] = await db.insert(newsletterSettings).values({ tenantId }).returning()
    settings = newSettings
  }

  return settings
}

export async function updateNewsletterSettings(data: Partial<z.infer<typeof updateSettingsSchema>>) {
  const { tenantId } = await getAuthContext()

  const validated = updateSettingsSchema.parse(data)

  // Check if settings exist
  let settings = await db.query.newsletterSettings.findFirst({
    where: eq(newsletterSettings.tenantId, tenantId),
  })

  if (settings) {
    const [updated] = await db
      .update(newsletterSettings)
      .set({
        ...validated,
        updatedAt: new Date(),
      })
      .where(eq(newsletterSettings.tenantId, tenantId))
      .returning()
    settings = updated
  } else {
    const [created] = await db
      .insert(newsletterSettings)
      .values({
        ...validated,
        tenantId,
      })
      .returning()
    settings = created
  }

  revalidatePath("/newsletter/settings")
  return settings
}

// ============================================
// Campaign Statistics
// ============================================

export async function getCampaignStats(campaignId: string) {
  const { tenantId } = await getAuthContext()

  const campaign = await db.query.newsletterCampaigns.findFirst({
    where: and(eq(newsletterCampaigns.id, campaignId), eq(newsletterCampaigns.tenantId, tenantId)),
  })

  if (!campaign) {
    throw new Error("Campaign not found")
  }

  // Get event counts
  const events = await db
    .select({
      event: newsletterEvents.event,
      count: sql<number>`count(*)::int`,
    })
    .from(newsletterEvents)
    .where(eq(newsletterEvents.campaignId, campaignId))
    .groupBy(newsletterEvents.event)

  const eventCounts = Object.fromEntries(events.map((e) => [e.event, e.count]))

  // Get recent opens
  const recentOpens = await db.query.newsletterEvents.findMany({
    where: and(eq(newsletterEvents.campaignId, campaignId), eq(newsletterEvents.event, "opened")),
    orderBy: [desc(newsletterEvents.occurredAt)],
    limit: 20,
    with: {
      contact: true,
    },
  })

  // Get recent clicks
  const recentClicks = await db.query.newsletterEvents.findMany({
    where: and(eq(newsletterEvents.campaignId, campaignId), eq(newsletterEvents.event, "clicked")),
    orderBy: [desc(newsletterEvents.occurredAt)],
    limit: 20,
    with: {
      contact: true,
    },
  })

  // Get link performance
  const links = await db.query.trackedLinks.findMany({
    where: eq(trackedLinks.campaignId, campaignId),
    orderBy: [desc(trackedLinks.clickCount)],
  })

  return {
    campaign,
    eventCounts,
    recentOpens,
    recentClicks,
    links,
    openRate: campaign.sentCount > 0 ? (campaign.openedCount / campaign.sentCount) * 100 : 0,
    clickRate: campaign.sentCount > 0 ? (campaign.clickedCount / campaign.sentCount) * 100 : 0,
    bounceRate: campaign.sentCount > 0 ? (campaign.bouncedCount / campaign.sentCount) * 100 : 0,
    unsubscribeRate: campaign.sentCount > 0 ? (campaign.unsubscribedCount / campaign.sentCount) * 100 : 0,
  }
}

export async function getNewsletterDashboardStats() {
  const { tenantId } = await getAuthContext()

  // Get list stats
  const lists = await db.query.subscriberLists.findMany({
    where: and(eq(subscriberLists.tenantId, tenantId), isNull(subscriberLists.deletedAt)),
  })

  const totalSubscribers = lists.reduce((sum, list) => sum + (list.subscriberCount ?? 0), 0)

  // Get campaign stats
  const campaigns = await db.query.newsletterCampaigns.findMany({
    where: and(eq(newsletterCampaigns.tenantId, tenantId), isNull(newsletterCampaigns.deletedAt)),
  })

  const totalCampaigns = campaigns.length
  const sentCampaigns = campaigns.filter((c) => c.status === "sent").length
  const scheduledCampaigns = campaigns.filter((c) => c.status === "scheduled").length
  const draftCampaigns = campaigns.filter((c) => c.status === "draft").length

  // Calculate aggregate email stats
  const totalSent = campaigns.reduce((sum, c) => sum + (c.sentCount ?? 0), 0)
  const totalOpened = campaigns.reduce((sum, c) => sum + (c.openedCount ?? 0), 0)
  const totalClicked = campaigns.reduce((sum, c) => sum + (c.clickedCount ?? 0), 0)
  const totalBounced = campaigns.reduce((sum, c) => sum + (c.bouncedCount ?? 0), 0)

  return {
    lists: {
      total: lists.length,
      totalSubscribers,
    },
    campaigns: {
      total: totalCampaigns,
      sent: sentCampaigns,
      scheduled: scheduledCampaigns,
      drafts: draftCampaigns,
    },
    emails: {
      totalSent,
      totalOpened,
      totalClicked,
      totalBounced,
      avgOpenRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
      avgClickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
      avgBounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
    },
  }
}