"use server"

import { db } from "@/lib/db"
import { events, venues, ticketTypes, attendees } from "@/lib/db/schema"
import { eq, and, desc, asc, sql, gte, lt } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { nanoid } from "nanoid"
import { getAuthContext } from "@/lib/auth"

const eventSchema = z.object({
  name: z.string().min(1, "Event name is required"),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  startsAt: z.string(),
  endsAt: z.string().optional(),
  doorsOpenAt: z.string().optional(),
  venueId: z.string().optional(),
  status: z.enum(["draft", "published", "cancelled", "postponed", "completed"]).optional(),
  coverImageUrl: z.string().optional(),
  category: z.string().optional(),
  minimumAge: z.number().optional(),
})

export type EventFormData = z.infer<typeof eventSchema>

async function getTenantId() {
  return getAuthContext()
}

export async function getEvents({
  filter = "all",
  page = 1,
  limit = 12,
}: {
  filter?: "all" | "upcoming" | "past" | "draft"
  page?: number
  limit?: number
} = {}) {
  const { tenantId } = await getTenantId()
  const now = new Date()

  const conditions = [
    eq(events.tenantId, tenantId),
    sql`${events.deletedAt} IS NULL`,
  ]

  if (filter === "upcoming") {
    conditions.push(gte(events.startsAt, now))
    conditions.push(eq(events.status, "published"))
  } else if (filter === "past") {
    conditions.push(lt(events.startsAt, now))
  } else if (filter === "draft") {
    conditions.push(eq(events.status, "draft"))
  }

  const [eventList, countResult] = await Promise.all([
    db.query.events.findMany({
      where: and(...conditions),
      with: {
        venue: true,
        ticketTypes: true,
      },
      orderBy: filter === "past" ? [desc(events.startsAt)] : [asc(events.startsAt)],
      limit,
      offset: (page - 1) * limit,
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(events)
      .where(and(...conditions)),
  ])

  return {
    events: eventList,
    total: Number(countResult[0].count),
    page,
    limit,
    totalPages: Math.ceil(Number(countResult[0].count) / limit),
  }
}

export async function getEvent(id: string) {
  const { tenantId } = await getTenantId()

  const event = await db.query.events.findFirst({
    where: and(
      eq(events.id, id),
      eq(events.tenantId, tenantId),
      sql`${events.deletedAt} IS NULL`
    ),
    with: {
      venue: true,
      ticketTypes: true,
      attendees: {
        limit: 100,
        orderBy: [desc(attendees.createdAt)],
      },
    },
  })

  if (!event) {
    throw new Error("Event not found")
  }

  return event
}

export async function createEvent(data: EventFormData) {
  const { tenantId, userId } = await getTenantId()

  const parsed = eventSchema.parse(data)

  const slug = parsed.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 50)
    + "-" + nanoid(6)

  const [event] = await db
    .insert(events)
    .values({
      tenantId,
      name: parsed.name,
      slug,
      description: parsed.description || null,
      shortDescription: parsed.shortDescription || null,
      startsAt: new Date(parsed.startsAt),
      endsAt: parsed.endsAt ? new Date(parsed.endsAt) : null,
      doorsOpenAt: parsed.doorsOpenAt ? new Date(parsed.doorsOpenAt) : null,
      venueId: parsed.venueId || null,
      status: parsed.status || "draft",
      coverImageUrl: parsed.coverImageUrl || null,
      category: parsed.category || null,
      minimumAge: parsed.minimumAge || null,
      createdById: userId,
    })
    .returning()

  revalidatePath("/events")
  return event
}

export async function updateEvent(id: string, data: Partial<EventFormData>) {
  const { tenantId } = await getTenantId()

  const [event] = await db
    .update(events)
    .set({
      ...data,
      startsAt: data.startsAt ? new Date(data.startsAt as unknown as string) : undefined,
      endsAt: data.endsAt ? new Date(data.endsAt as unknown as string) : undefined,
      doorsOpenAt: data.doorsOpenAt ? new Date(data.doorsOpenAt as unknown as string) : undefined,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(events.id, id),
        eq(events.tenantId, tenantId)
      )
    )
    .returning()

  if (!event) {
    throw new Error("Event not found")
  }

  revalidatePath("/events")
  revalidatePath(`/events/${id}`)
  return event
}

export async function publishEvent(id: string) {
  const { tenantId } = await getTenantId()

  const [event] = await db
    .update(events)
    .set({
      status: "published",
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(events.id, id),
        eq(events.tenantId, tenantId)
      )
    )
    .returning()

  revalidatePath("/events")
  revalidatePath(`/events/${id}`)
  return event
}

export async function deleteEvent(id: string) {
  const { tenantId } = await getTenantId()

  await db
    .update(events)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(events.id, id),
        eq(events.tenantId, tenantId)
      )
    )

  revalidatePath("/events")
}

export async function getEventStats() {
  const { tenantId } = await getTenantId()
  const now = new Date()

  const [total, upcoming, thisMonth, totalAttendees] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(events)
      .where(
        and(
          eq(events.tenantId, tenantId),
          sql`${events.deletedAt} IS NULL`
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(events)
      .where(
        and(
          eq(events.tenantId, tenantId),
          eq(events.status, "published"),
          gte(events.startsAt, now),
          sql`${events.deletedAt} IS NULL`
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(events)
      .where(
        and(
          eq(events.tenantId, tenantId),
          sql`${events.deletedAt} IS NULL`,
          sql`${events.startsAt} >= date_trunc('month', current_date)`,
          sql`${events.startsAt} < date_trunc('month', current_date) + interval '1 month'`
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(attendees)
      .where(eq(attendees.tenantId, tenantId)),
  ])

  return {
    total: Number(total[0].count),
    upcoming: Number(upcoming[0].count),
    thisMonth: Number(thisMonth[0].count),
    totalAttendees: Number(totalAttendees[0].count),
  }
}

// Venues
export async function getVenues() {
  const { tenantId } = await getTenantId()

  return db.query.venues.findMany({
    where: and(
      eq(venues.tenantId, tenantId),
      sql`${venues.deletedAt} IS NULL`
    ),
    orderBy: [asc(venues.name)],
  })
}

export async function createVenue(data: {
  name: string
  addressLine1?: string
  city?: string
  state?: string
  capacity?: number
}) {
  const { tenantId } = await getTenantId()

  const [venue] = await db
    .insert(venues)
    .values({
      tenantId,
      name: data.name,
      addressLine1: data.addressLine1 || null,
      city: data.city || null,
      state: data.state || null,
      capacity: data.capacity || null,
    })
    .returning()

  return venue
}
