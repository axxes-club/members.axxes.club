"use server"

import { db } from "@/lib/db"
import { events, venues, attendees } from "@/lib/db/schema"
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
const venueSchema = z.object({
  name: z.string().min(1, "Venue name is required"),
  description: z.string().optional(),
  capacity: z.number().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().optional(),
})

export type VenueFormData = z.infer<typeof venueSchema>

export async function getVenues({
  page = 1,
  limit = 50,
}: {
  page?: number
  limit?: number
} = {}) {
  const { tenantId } = await getTenantId()

  const [venueList, countResult] = await Promise.all([
    db.query.venues.findMany({
      where: and(
        eq(venues.tenantId, tenantId),
        sql`${venues.deletedAt} IS NULL`
      ),
      orderBy: [asc(venues.name)],
      limit,
      offset: (page - 1) * limit,
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(venues)
      .where(and(
        eq(venues.tenantId, tenantId),
        sql`${venues.deletedAt} IS NULL`
      )),
  ])

  return {
    venues: venueList,
    total: Number(countResult[0].count),
    page,
    limit,
    totalPages: Math.ceil(Number(countResult[0].count) / limit),
  }
}

export async function getVenue(id: string) {
  const { tenantId } = await getTenantId()

  const venue = await db.query.venues.findFirst({
    where: and(
      eq(venues.id, id),
      eq(venues.tenantId, tenantId),
      sql`${venues.deletedAt} IS NULL`
    ),
    with: {
      events: {
        where: sql`${events.deletedAt} IS NULL`,
        orderBy: [desc(events.startsAt)],
        limit: 10,
      },
    },
  })

  if (!venue) {
    throw new Error("Venue not found")
  }

  return venue
}

export async function createVenue(data: VenueFormData) {
  const { tenantId } = await getTenantId()

  const parsed = venueSchema.parse(data)

  const slug = parsed.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 50)

  const [venue] = await db
    .insert(venues)
    .values({
      tenantId,
      name: parsed.name,
      slug,
      description: parsed.description || null,
      capacity: parsed.capacity || null,
      addressLine1: parsed.addressLine1 || null,
      addressLine2: parsed.addressLine2 || null,
      city: parsed.city || null,
      state: parsed.state || null,
      postalCode: parsed.postalCode || null,
      country: parsed.country || "US",
      phone: parsed.phone || null,
      email: parsed.email || null,
      website: parsed.website || null,
    })
    .returning()

  revalidatePath("/events/venues")
  return venue
}

export async function updateVenue(id: string, data: Partial<VenueFormData>) {
  const { tenantId } = await getTenantId()

  const [venue] = await db
    .update(venues)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(venues.id, id),
        eq(venues.tenantId, tenantId)
      )
    )
    .returning()

  if (!venue) {
    throw new Error("Venue not found")
  }

  revalidatePath("/events/venues")
  revalidatePath(`/events/venues/${id}`)
  return venue
}

export async function deleteVenue(id: string) {
  const { tenantId } = await getTenantId()

  // Check if venue has events
  const venueEvents = await db.query.events.findMany({
    where: and(
      eq(events.venueId, id),
      eq(events.tenantId, tenantId),
      sql`${events.deletedAt} IS NULL`
    ),
    limit: 1,
  })

  if (venueEvents.length > 0) {
    throw new Error("Cannot delete venue with associated events")
  }

  await db
    .update(venues)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(venues.id, id),
        eq(venues.tenantId, tenantId)
      )
    )

  revalidatePath("/events/venues")
}

export async function getVenueStats() {
  const { tenantId } = await getTenantId()

  const [totalVenues, totalCapacity, venuesWithEvents] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(venues)
      .where(and(
        eq(venues.tenantId, tenantId),
        sql`${venues.deletedAt} IS NULL`
      )),
    db
      .select({ total: sql<number>`COALESCE(SUM(${venues.capacity}), 0)` })
      .from(venues)
      .where(and(
        eq(venues.tenantId, tenantId),
        sql`${venues.deletedAt} IS NULL`
      )),
    db
      .select({ count: sql<number>`count(DISTINCT ${events.venueId})` })
      .from(events)
      .where(and(
        eq(events.tenantId, tenantId),
        sql`${events.deletedAt} IS NULL`,
        sql`${events.venueId} IS NOT NULL`
      )),
  ])

  return {
    total: Number(totalVenues[0].count),
    totalCapacity: Number(totalCapacity[0].total),
    withEvents: Number(venuesWithEvents[0].count),
  }
}
