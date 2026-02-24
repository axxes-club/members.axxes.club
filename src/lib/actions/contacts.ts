"use server"

import { db } from "@/lib/db"
import { contacts, customerSegments, segmentMemberships, contactInteractions } from "@/lib/db/schema"
import { eq, and, ilike, desc, asc, sql, or, inArray, isNull, gte, lte } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getAuthContext } from "@/lib/auth"

const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  leadSource: z.string().optional(),
  notes: z.string().optional(),
  type: z.enum(["lead", "customer", "vip", "vendor", "partner"]).optional(),
})

export type ContactFormData = z.infer<typeof contactSchema>

async function getTenantId() {
  return getAuthContext()
}

export async function getContacts({
  search,
  sortBy = "createdAt",
  sortOrder = "desc",
  page = 1,
  limit = 20,
}: {
  search?: string
  sortBy?: "firstName" | "lastName" | "email" | "createdAt"
  sortOrder?: "asc" | "desc"
  page?: number
  limit?: number
} = {}) {
  const { tenantId } = await getTenantId()

  const conditions = [
    eq(contacts.tenantId, tenantId),
    sql`${contacts.deletedAt} IS NULL`,
  ]

  if (search) {
    conditions.push(
      or(
        ilike(contacts.firstName, `%${search}%`),
        ilike(contacts.lastName, `%${search}%`),
        ilike(contacts.email, `%${search}%`),
        ilike(contacts.company, `%${search}%`)
      )!
    )
  }

  const orderColumn = {
    firstName: contacts.firstName,
    lastName: contacts.lastName,
    email: contacts.email,
    createdAt: contacts.createdAt,
  }[sortBy]

  const orderFn = sortOrder === "asc" ? asc : desc

  const [contactList, countResult] = await Promise.all([
    db
      .select()
      .from(contacts)
      .where(and(...conditions))
      .orderBy(orderFn(orderColumn))
      .limit(limit)
      .offset((page - 1) * limit),
    db
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(and(...conditions)),
  ])

  return {
    contacts: contactList,
    total: Number(countResult[0].count),
    page,
    limit,
    totalPages: Math.ceil(Number(countResult[0].count) / limit),
  }
}

export async function getContact(id: string) {
  const { tenantId } = await getTenantId()

  const contact = await db.query.contacts.findFirst({
    where: and(
      eq(contacts.id, id),
      eq(contacts.tenantId, tenantId),
      sql`${contacts.deletedAt} IS NULL`
    ),
  })

  if (!contact) {
    throw new Error("Contact not found")
  }

  return contact
}

export async function createContact(data: ContactFormData) {
  const { tenantId } = await getTenantId()

  const parsed = contactSchema.parse(data)

  const [contact] = await db
    .insert(contacts)
    .values({
      tenantId,
      firstName: parsed.firstName,
      lastName: parsed.lastName || null,
      email: parsed.email || null,
      phone: parsed.phone || null,
      company: parsed.company || null,
      jobTitle: parsed.jobTitle || null,
      leadSource: parsed.leadSource || null,
      notes: parsed.notes || null,
      type: parsed.type || "lead",
    })
    .returning()

  revalidatePath("/crm")
  return contact
}

export async function updateContact(id: string, data: ContactFormData) {
  const { tenantId } = await getTenantId()

  const parsed = contactSchema.parse(data)

  const [contact] = await db
    .update(contacts)
    .set({
      firstName: parsed.firstName,
      lastName: parsed.lastName || null,
      email: parsed.email || null,
      phone: parsed.phone || null,
      company: parsed.company || null,
      jobTitle: parsed.jobTitle || null,
      leadSource: parsed.leadSource || null,
      notes: parsed.notes || null,
      type: parsed.type,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(contacts.id, id),
        eq(contacts.tenantId, tenantId)
      )
    )
    .returning()

  if (!contact) {
    throw new Error("Contact not found")
  }

  revalidatePath("/crm")
  revalidatePath(`/crm/${id}`)
  return contact
}

export async function deleteContact(id: string) {
  const { tenantId } = await getTenantId()

  await db
    .update(contacts)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(contacts.id, id),
        eq(contacts.tenantId, tenantId)
      )
    )

  revalidatePath("/crm")
}

export async function getContactStats() {
  const { tenantId } = await getTenantId()

  const [total, thisMonth, leads, customers] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(
        and(
          eq(contacts.tenantId, tenantId),
          sql`${contacts.deletedAt} IS NULL`
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(
        and(
          eq(contacts.tenantId, tenantId),
          sql`${contacts.deletedAt} IS NULL`,
          sql`${contacts.createdAt} >= date_trunc('month', current_date)`
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(
        and(
          eq(contacts.tenantId, tenantId),
          eq(contacts.type, "lead"),
          sql`${contacts.deletedAt} IS NULL`
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(
        and(
          eq(contacts.tenantId, tenantId),
          eq(contacts.type, "customer"),
          sql`${contacts.deletedAt} IS NULL`
        )
      ),
  ])

  return {
    total: Number(total[0].count),
    thisMonth: Number(thisMonth[0].count),
    leads: Number(leads[0].count),
    customers: Number(customers[0].count),
  }
}

// ============================================
// CONTACT INTERACTIONS
// ============================================

const interactionSchema = z.object({
  type: z.enum(["email", "call", "meeting", "note", "sms", "social"]),
  subject: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  occurredAt: z.string().optional(),
})

export type InteractionFormData = z.infer<typeof interactionSchema>

export async function getContactInteractions(contactId: string) {
  const { tenantId } = await getTenantId()

  // Verify contact belongs to tenant
  const contact = await db.query.contacts.findFirst({
    where: and(
      eq(contacts.id, contactId),
      eq(contacts.tenantId, tenantId),
      isNull(contacts.deletedAt)
    ),
  })

  if (!contact) {
    throw new Error("Contact not found")
  }

  const interactions = await db.query.contactInteractions.findMany({
    where: eq(contactInteractions.contactId, contactId),
    orderBy: [desc(contactInteractions.occurredAt)],
  })

  return interactions
}

export async function createContactInteraction(contactId: string, data: InteractionFormData) {
  const { tenantId, userId } = await getTenantId()

  // Verify contact belongs to tenant
  const contact = await db.query.contacts.findFirst({
    where: and(
      eq(contacts.id, contactId),
      eq(contacts.tenantId, tenantId),
      isNull(contacts.deletedAt)
    ),
  })

  if (!contact) {
    throw new Error("Contact not found")
  }

  const parsed = interactionSchema.parse(data)

  const [interaction] = await db
    .insert(contactInteractions)
    .values({
      tenantId,
      contactId,
      type: parsed.type,
      subject: parsed.subject || null,
      content: parsed.content,
      userId: userId,
      occurredAt: parsed.occurredAt ? new Date(parsed.occurredAt) : new Date(),
    })
    .returning()

  revalidatePath(`/crm/${contactId}`)
  return interaction
}

export async function deleteContactInteraction(interactionId: string) {
  const { tenantId } = await getTenantId()

  const interaction = await db.query.contactInteractions.findFirst({
    where: eq(contactInteractions.id, interactionId),
  })

  if (!interaction || interaction.tenantId !== tenantId) {
    throw new Error("Interaction not found")
  }

  await db.delete(contactInteractions).where(eq(contactInteractions.id, interactionId))

  revalidatePath(`/crm/${interaction.contactId}`)
}

// ============================================
// CUSTOMER SEGMENTS
// ============================================

const segmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  color: z.string().optional(),
  filterCriteria: z.array(z.object({
    field: z.string(),
    operator: z.enum(["equals", "contains", "gt", "lt", "in", "notIn"]),
    value: z.unknown(),
  })).optional(),
  isDynamic: z.boolean().optional(),
})

export type SegmentFormData = z.infer<typeof segmentSchema>

export async function getSegments() {
  const { tenantId } = await getTenantId()

  const segments = await db.query.customerSegments.findMany({
    where: and(
      eq(customerSegments.tenantId, tenantId),
      isNull(customerSegments.deletedAt)
    ),
    orderBy: [desc(customerSegments.createdAt)],
    with: {
      memberships: {
        columns: { contactId: true },
      },
    },
  })

  return segments.map(segment => ({
    ...segment,
    memberCount: segment.memberships.length,
    memberships: undefined,
  }))
}

export async function getSegment(id: string) {
  const { tenantId } = await getTenantId()

  const segment = await db.query.customerSegments.findFirst({
    where: and(
      eq(customerSegments.id, id),
      eq(customerSegments.tenantId, tenantId),
      isNull(customerSegments.deletedAt)
    ),
    with: {
      memberships: {
        with: {
          contact: true,
        },
      },
    },
  })

  if (!segment) {
    throw new Error("Segment not found")
  }

  return segment
}

export async function createSegment(data: SegmentFormData) {
  const { tenantId } = await getTenantId()

  const parsed = segmentSchema.parse(data)

  const [segment] = await db
    .insert(customerSegments)
    .values({
      tenantId,
      name: parsed.name,
      description: parsed.description || null,
      color: parsed.color || null,
      filterCriteria: parsed.filterCriteria || [],
      isDynamic: parsed.isDynamic ?? true,
    })
    .returning()

  revalidatePath("/crm")
  return segment
}

export async function updateSegment(id: string, data: Partial<SegmentFormData>) {
  const { tenantId } = await getTenantId()

  const [segment] = await db
    .update(customerSegments)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(customerSegments.id, id),
        eq(customerSegments.tenantId, tenantId)
      )
    )
    .returning()

  if (!segment) {
    throw new Error("Segment not found")
  }

  revalidatePath("/crm")
  return segment
}

export async function deleteSegment(id: string) {
  const { tenantId } = await getTenantId()

  // Soft delete
  await db
    .update(customerSegments)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(customerSegments.id, id),
        eq(customerSegments.tenantId, tenantId)
      )
    )

  // Delete memberships
  await db.delete(segmentMemberships).where(eq(segmentMemberships.segmentId, id))

  revalidatePath("/crm")
}

export async function addContactsToSegment(segmentId: string, contactIds: string[]) {
  const { tenantId } = await getTenantId()

  // Verify segment belongs to tenant
  const segment = await db.query.customerSegments.findFirst({
    where: and(
      eq(customerSegments.id, segmentId),
      eq(customerSegments.tenantId, tenantId),
      isNull(customerSegments.deletedAt)
    ),
  })

  if (!segment) {
    throw new Error("Segment not found")
  }

  // Verify all contacts belong to tenant
  const validContacts = await db.query.contacts.findMany({
    where: and(
      inArray(contacts.id, contactIds),
      eq(contacts.tenantId, tenantId),
      isNull(contacts.deletedAt)
    ),
  })

  const validContactIds = validContacts.map(c => c.id)

  // Get existing memberships to avoid duplicates
  const existingMemberships = await db.query.segmentMemberships.findMany({
    where: and(
      eq(segmentMemberships.segmentId, segmentId),
      inArray(segmentMemberships.contactId, validContactIds)
    ),
  })

  const existingContactIds = new Set(existingMemberships.map(m => m.contactId))
  const newContactIds = validContactIds.filter(id => !existingContactIds.has(id))

  if (newContactIds.length > 0) {
    await db.insert(segmentMemberships).values(
      newContactIds.map(contactId => ({
        segmentId,
        contactId,
      }))
    )
  }

  // Update contact count
  const memberCount = await db.query.segmentMemberships.findMany({
    where: eq(segmentMemberships.segmentId, segmentId),
  })

  await db
    .update(customerSegments)
    .set({
      contactCount: memberCount.length,
      lastCalculatedAt: new Date(),
    })
    .where(eq(customerSegments.id, segmentId))

  revalidatePath("/crm")
}

export async function removeContactsFromSegment(segmentId: string, contactIds: string[]) {
  const { tenantId } = await getTenantId()

  // Verify segment belongs to tenant
  const segment = await db.query.customerSegments.findFirst({
    where: and(
      eq(customerSegments.id, segmentId),
      eq(customerSegments.tenantId, tenantId),
      isNull(customerSegments.deletedAt)
    ),
  })

  if (!segment) {
    throw new Error("Segment not found")
  }

  await db
    .delete(segmentMemberships)
    .where(
      and(
        eq(segmentMemberships.segmentId, segmentId),
        inArray(segmentMemberships.contactId, contactIds)
      )
    )

  // Update contact count
  const memberCount = await db.query.segmentMemberships.findMany({
    where: eq(segmentMemberships.segmentId, segmentId),
  })

  await db
    .update(customerSegments)
    .set({
      contactCount: memberCount.length,
      lastCalculatedAt: new Date(),
    })
    .where(eq(customerSegments.id, segmentId))

  revalidatePath("/crm")
}

// ============================================
// ADVANCED FILTERING
// ============================================

export async function getContactsByFilter({
  types,
  leadStatuses,
  leadSources,
  tags,
  hasEmail,
  hasPhone,
  createdAfter,
  createdBefore,
  search,
  sortBy = "createdAt",
  sortOrder = "desc",
  page = 1,
  limit = 20,
}: {
  types?: string[]
  leadStatuses?: string[]
  leadSources?: string[]
  tags?: string[]
  hasEmail?: boolean
  hasPhone?: boolean
  createdAfter?: string
  createdBefore?: string
  search?: string
  sortBy?: "firstName" | "lastName" | "email" | "createdAt" | "leadScore"
  sortOrder?: "asc" | "desc"
  page?: number
  limit?: number
} = {}) {
  const { tenantId } = await getTenantId()

  const conditions = [
    eq(contacts.tenantId, tenantId),
    isNull(contacts.deletedAt),
  ]

  if (types && types.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conditions.push(inArray(contacts.type, types as any))
  }

  if (leadStatuses && leadStatuses.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conditions.push(inArray(contacts.leadStatus, leadStatuses as any))
  }

  if (leadSources && leadSources.length > 0) {
    conditions.push(inArray(contacts.leadSource, leadSources))
  }

  if (tags && tags.length > 0) {
    // PostgreSQL array overlap
    conditions.push(sql`${contacts.tags} && ${tags}`)
  }

  if (hasEmail === true) {
    conditions.push(sql`${contacts.email} IS NOT NULL AND ${contacts.email} != ''`)
  }

  if (hasPhone === true) {
    conditions.push(sql`${contacts.phone} IS NOT NULL AND ${contacts.phone} != ''`)
  }

  if (createdAfter) {
    conditions.push(gte(contacts.createdAt, new Date(createdAfter)))
  }

  if (createdBefore) {
    conditions.push(lte(contacts.createdAt, new Date(createdBefore)))
  }

  if (search) {
    conditions.push(
      or(
        ilike(contacts.firstName, `%${search}%`),
        ilike(contacts.lastName, `%${search}%`),
        ilike(contacts.email, `%${search}%`),
        ilike(contacts.company, `%${search}%`),
        ilike(contacts.phone, `%${search}%`)
      )!
    )
  }

  const orderColumn = {
    firstName: contacts.firstName,
    lastName: contacts.lastName,
    email: contacts.email,
    createdAt: contacts.createdAt,
    leadScore: contacts.leadScore,
  }[sortBy] || contacts.createdAt

  const orderFn = sortOrder === "asc" ? asc : desc

  const [contactList, countResult] = await Promise.all([
    db
      .select()
      .from(contacts)
      .where(and(...conditions))
      .orderBy(orderFn(orderColumn))
      .limit(limit)
      .offset((page - 1) * limit),
    db
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(and(...conditions)),
  ])

  return {
    contacts: contactList,
    total: Number(countResult[0].count),
    page,
    limit,
    totalPages: Math.ceil(Number(countResult[0].count) / limit),
  }
}

// ============================================
// LEAD PIPELINE
// ============================================

export async function getLeadPipeline() {
  const { tenantId } = await getTenantId()

  const leads = await db.query.contacts.findMany({
    where: and(
      eq(contacts.tenantId, tenantId),
      eq(contacts.type, "lead"),
      isNull(contacts.deletedAt)
    ),
    orderBy: [desc(contacts.leadScore), desc(contacts.createdAt)],
  })

  // Group by lead status
  const pipeline = {
    new: leads.filter(l => l.leadStatus === "new" || !l.leadStatus),
    contacted: leads.filter(l => l.leadStatus === "contacted"),
    qualified: leads.filter(l => l.leadStatus === "qualified"),
    converted: leads.filter(l => l.leadStatus === "converted"),
    lost: leads.filter(l => l.leadStatus === "lost"),
  }

  return pipeline
}

export async function updateLeadStatus(contactId: string, status: "new" | "contacted" | "qualified" | "converted" | "lost") {
  const { tenantId } = await getTenantId()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {
    leadStatus: status,
    updatedAt: new Date(),
  }

  if (status === "converted") {
    updateData.convertedAt = new Date()
    updateData.type = "customer"
  }

  const [contact] = await db
    .update(contacts)
    .set(updateData)
    .where(
      and(
        eq(contacts.id, contactId),
        eq(contacts.tenantId, tenantId)
      )
    )
    .returning()

  if (!contact) {
    throw new Error("Contact not found")
  }

  revalidatePath("/crm")
  revalidatePath(`/crm/${contactId}`)
  return contact
}

export async function updateLeadScore(contactId: string, score: number) {
  const { tenantId } = await getTenantId()

  const [contact] = await db
    .update(contacts)
    .set({
      leadScore: Math.max(0, Math.min(100, score)),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(contacts.id, contactId),
        eq(contacts.tenantId, tenantId)
      )
    )
    .returning()

  if (!contact) {
    throw new Error("Contact not found")
  }

  revalidatePath("/crm")
  revalidatePath(`/crm/${contactId}`)
  return contact
}

// ============================================
// BULK OPERATIONS
// ============================================

export async function bulkUpdateContactType(contactIds: string[], type: "lead" | "customer" | "vip" | "vendor" | "partner") {
  const { tenantId } = await getTenantId()

  // Verify all contacts belong to tenant
  const validContacts = await db.query.contacts.findMany({
    where: and(
      inArray(contacts.id, contactIds),
      eq(contacts.tenantId, tenantId),
      isNull(contacts.deletedAt)
    ),
  })

  const validContactIds = validContacts.map(c => c.id)

  await db
    .update(contacts)
    .set({
      type,
      updatedAt: new Date(),
    })
    .where(inArray(contacts.id, validContactIds))

  revalidatePath("/crm")
}

export async function bulkAddTags(contactIds: string[], tags: string[]) {
  const { tenantId } = await getTenantId()

  // Verify all contacts belong to tenant and get their current tags
  const validContacts = await db.query.contacts.findMany({
    where: and(
      inArray(contacts.id, contactIds),
      eq(contacts.tenantId, tenantId),
      isNull(contacts.deletedAt)
    ),
  })

  for (const contact of validContacts) {
    const currentTags = contact.tags || []
    const newTags = [...new Set([...currentTags, ...tags])]

    await db
      .update(contacts)
      .set({
        tags: newTags,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, contact.id))
  }

  revalidatePath("/crm")
}

export async function bulkDeleteContacts(contactIds: string[]) {
  const { tenantId } = await getTenantId()

  // Verify all contacts belong to tenant
  const validContacts = await db.query.contacts.findMany({
    where: and(
      inArray(contacts.id, contactIds),
      eq(contacts.tenantId, tenantId),
      isNull(contacts.deletedAt)
    ),
  })

  const validContactIds = validContacts.map(c => c.id)

  await db
    .update(contacts)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(inArray(contacts.id, validContactIds))

  revalidatePath("/crm")
}

// ============================================
// METADATA FOR FILTERS
// ============================================

export async function getContactFilterMetadata() {
  const { tenantId } = await getTenantId()

  const allContacts = await db.query.contacts.findMany({
    where: and(
      eq(contacts.tenantId, tenantId),
      isNull(contacts.deletedAt)
    ),
    columns: {
      leadSource: true,
      tags: true,
    },
  })

  // Extract unique lead sources
  const leadSources = [...new Set(allContacts.map(c => c.leadSource).filter(Boolean))] as string[]

  // Extract unique tags
  const allTags = allContacts.flatMap(c => c.tags || [])
  const tags = [...new Set(allTags)] as string[]

  return {
    leadSources,
    tags,
    types: ["lead", "customer", "vip", "vendor", "partner"],
    leadStatuses: ["new", "contacted", "qualified", "converted", "lost"],
  }
}
