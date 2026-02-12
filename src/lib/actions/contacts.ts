"use server"

import { db } from "@/lib/db"
import { contacts, customerSegments, segmentMemberships } from "@/lib/db/schema"
import { eq, and, ilike, desc, asc, sql, or } from "drizzle-orm"
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
