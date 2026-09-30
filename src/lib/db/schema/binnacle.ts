import { pgTable, text, timestamp, uuid, boolean, integer, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"
import { tenants } from "./tenants"
import { user } from "./users"

/**
 * Binnacle — support desk.
 *
 * A copy of members.axxes.club/db/binnacle.sql, not the original. The portal
 * owns the database; this app runs no migrations. Keep the two in step.
 *
 * See the DDL for why messages, notes and events share one table, and why
 * `binnacle_events` is append-only.
 */

export const binnacleMailboxes = pgTable(
  "binnacle_mailboxes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    email: text("email").notNull(),
    aliases: jsonb("aliases").$type<string[]>().notNull().default([]),

    imapHost: text("imap_host"),
    imapPort: integer("imap_port"),
    imapUser: text("imap_user"),
    // Encrypted at rest by the portal. Never selected into a client payload.
    imapPassword: text("imap_password"),
    imapTls: boolean("imap_tls").notNull().default(true),

    smtpHost: text("smtp_host"),
    smtpPort: integer("smtp_port"),
    smtpUser: text("smtp_user"),
    smtpPassword: text("smtp_password"),

    lastPolledAt: timestamp("last_polled_at", { withTimezone: true }),
    lastError: text("last_error"),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("binnacle_mailboxes_tenant_email_idx").on(table.tenantId, table.email),
    index("binnacle_mailboxes_tenant_idx").on(table.tenantId),
  ],
)

export const binnacleTeams = pgTable(
  "binnacle_teams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    /** Agent emails. Read whole on every assignment, hence denormalised. */
    members: jsonb("members").$type<string[]>().notNull().default([]),

    strategy: text("strategy").notNull().default("manual"),
    capacity: integer("capacity").notNull().default(10),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("binnacle_teams_tenant_slug_idx").on(table.tenantId, table.slug),
    index("binnacle_teams_tenant_idx").on(table.tenantId),
  ],
)

export const binnacleTickets = pgTable(
  "binnacle_tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

    /** Sequential per tenant, e.g. TK-1042. */
    reference: integer("reference").notNull(),
    subject: text("subject").notNull(),
    preview: text("preview"),

    status: text("status").notNull().default("new"),
    priority: text("priority").notNull().default("normal"),

    requesterName: text("requester_name"),
    requesterEmail: text("requester_email"),
    contactId: uuid("contact_id"),

    mailboxId: uuid("mailbox_id").references(() => binnacleMailboxes.id, { onDelete: "set null" }),
    emailThreadId: text("email_thread_id"),
    emailMessageId: text("email_message_id"),

    teamId: uuid("team_id").references(() => binnacleTeams.id, { onDelete: "set null" }),
    assigneeId: text("assignee_id"),
    assigneeName: text("assignee_name"),

    tags: text("tags").array().notNull().default([]),

    slaPolicyId: uuid("sla_policy_id"),
    firstResponseDueAt: timestamp("first_response_due_at", { withTimezone: true }),
    resolutionDueAt: timestamp("resolution_due_at", { withTimezone: true }),
    firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),

    internalSummary: text("internal_summary"),

    /** Null means not snoozed. A bool here could disagree with its own clock. */
    snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),

    starred: boolean("starred").notNull().default(false),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
    lastPublicAt: timestamp("last_public_at", { withTimezone: true }),

    createdById: text("created_by_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Partial: solved and closed are the majority of rows and never appear in
    // the hot queue query, so they stay out of this index entirely.
    index("binnacle_tickets_queue_idx")
      .on(table.tenantId, table.lastActivityAt.desc())
      .where(sql`status not in ('solved', 'closed')`),
    index("binnacle_tickets_tenant_status_idx").on(table.tenantId, table.status),
    index("binnacle_tickets_assignee_idx").on(table.tenantId, table.assigneeId),
    index("binnacle_tickets_requester_email_idx").on(table.tenantId, table.requesterEmail),
    uniqueIndex("binnacle_tickets_reference_idx").on(table.tenantId, table.reference),
  ],
)

export const binnacleMessages = pgTable(
  "binnacle_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    ticketId: uuid("ticket_id").notNull().references(() => binnacleTickets.id, { onDelete: "cascade" }),

    /** reply (customer-visible) | note (internal) | event (system line) */
    kind: text("kind").notNull().default("reply"),

    authorId: text("author_id"),
    authorName: text("author_name"),
    authorEmail: text("author_email"),
    authorType: text("author_type").notNull().default("agent"),

    subject: text("subject"),
    body: text("body").notNull(),
    bodyJson: jsonb("body_json").$type<Record<string, unknown>>(),

    /**
     * Idempotency for inbound mail. A retried poll must not create a second
     * reply — this is the one place a duplicate is genuinely harmful.
     */
    externalId: text("external_id"),

    cannedId: uuid("canned_id"),

    isPublic: boolean("is_public").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
  },
  (table) => [
    index("binnacle_messages_ticket_idx").on(table.ticketId, table.createdAt),
    uniqueIndex("binnacle_messages_external_idx")
      .on(table.tenantId, table.externalId)
      .where(sql`external_id is not null`),
  ],
)

/** Append-only. Never updated, never deleted — see the DDL. */
export const binnacleEvents = pgTable(
  "binnacle_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    ticketId: uuid("ticket_id").notNull().references(() => binnacleTickets.id, { onDelete: "cascade" }),

    kind: text("kind").notNull(),
    field: text("field"),
    fromValue: text("from_value"),
    toValue: text("to_value"),
    actorId: text("actor_id"),
    actorName: text("actor_name"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("binnacle_events_ticket_idx").on(table.ticketId, table.createdAt)],
)

export const binnacleCanned = pgTable(
  "binnacle_canned",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    body: text("body").notNull(),
    /** 'reply' | 'note'. Separate, so an internal note cannot be pasted to a customer. */
    visibility: text("visibility").notNull().default("reply"),
    shortcut: text("shortcut"),
    folder: text("folder"),
    usageCount: integer("usage_count").notNull().default(0),

    createdById: text("created_by_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("binnacle_canned_tenant_idx").on(table.tenantId),
    uniqueIndex("binnacle_canned_shortcut_idx")
      .on(table.tenantId, table.shortcut)
      .where(sql`shortcut is not null`),
  ],
)

export const binnacleMacros = pgTable(
  "binnacle_macros",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    body: text("body").notNull(),
    shortcut: text("shortcut"),
    /** Narrow by design: set status, priority, tags. It cannot delete. */
    actions: jsonb("actions").$type<{ field: string; value: unknown }[]>().notNull().default([]),
    usageCount: integer("usage_count").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("binnacle_macros_shortcut_idx")
      .on(table.tenantId, table.shortcut)
      .where(sql`shortcut is not null`),
  ],
)
export const binnacleSlas = pgTable(
  "binnacle_slas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    /** Minutes. An SLA is never ambiguous about a timezone if it is an integer. */
    firstResponseMinutes: integer("first_response_minutes").notNull(),
    resolutionMinutes: integer("resolution_minutes").notNull(),

    appliesToKind: text("applies_to_kind").notNull().default("all"),
    appliesToValue: text("applies_to_value"),

    /** 'pause' (wait, clock stops) | 'stop' (SLA ends). No third behaviour. */
    onPending: text("on_pending").notNull().default("pause"),
    businessHoursId: uuid("business_hours_id"),

    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("binnacle_slas_tenant_idx").on(table.tenantId)],
)

export const binnacleAutomations = pgTable(
  "binnacle_automations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    trigger: text("trigger").notNull(),
    conditions: jsonb("conditions").$type<{ field: string; op: string; value: unknown }[]>().notNull().default([]),
    actions: jsonb("actions").$type<{ field: string; value: unknown }[]>().notNull().default([]),

    /** Higher first. A number, not a timestamp, so same-millisecond rules still order. */
    priority: integer("priority").notNull().default(0),
    runCount: integer("run_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("binnacle_automations_tenant_idx").on(table.tenantId, table.trigger, table.priority.desc())],
)

export const binnacleArticles = pgTable(
  "binnacle_articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    slug: text("slug").notNull(),
    body: text("body").notNull(),
    /** Plain text, kept in step on write. The AI must never quote HTML back. */
    bodyText: text("body_text").notNull(),
    status: text("status").notNull().default("draft"),
    visibility: text("visibility").notNull().default("public"),

    viewCount: integer("view_count").notNull().default(0),
    helpfulCount: integer("helpful_count").notNull().default(0),
    unhelpfulCount: integer("unhelpful_count").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("binnacle_articles_tenant_slug_idx").on(table.tenantId, table.slug),
    index("binnacle_articles_tenant_status_idx").on(table.tenantId, table.status),
  ],
)

export const binnacleCsat = pgTable(
  "binnacle_csat",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    ticketId: uuid("ticket_id").notNull().references(() => binnacleTickets.id, { onDelete: "cascade" }),

    rating: integer("rating").notNull(),
    comment: text("comment"),
    /** Captured at rating time, so later state changes do not rewrite history. */
    ticketStatus: text("ticket_status"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("binnacle_csat_ticket_idx").on(table.ticketId)],
)

/**
 * The folder Binnacle registers in each workspace's Folders account.
 *
 * Folders derives its folder list from the distinct values in `assets.folder`,
 * so an empty folder cannot exist there. This row is what makes the app's
 * folder real before the first attachment exists. The DAM unions these in.
 */
export const binnacleFolders = pgTable(
  "binnacle_folders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

    /** Root path only, e.g. "Support". No trailing slash. */
    path: text("path").notNull(),
    label: text("label").notNull(),
    href: text("href").notNull().default("/"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("binnacle_folders_tenant_path_idx").on(table.tenantId, table.path)],
)

export const binnacleTicketsRelations = relations(binnacleTickets, ({ one, many }) => ({
  tenant: one(tenants, { fields: [binnacleTickets.tenantId], references: [tenants.id] }),
  mailbox: one(binnacleMailboxes, { fields: [binnacleTickets.mailboxId], references: [binnacleMailboxes.id] }),
  team: one(binnacleTeams, { fields: [binnacleTickets.teamId], references: [binnacleTeams.id] }),
  messages: many(binnacleMessages),
  events: many(binnacleEvents),
}))

export type BinnacleMailbox = typeof binnacleMailboxes.$inferSelect
export type BinnacleTeam = typeof binnacleTeams.$inferSelect
export type BinnacleTicket = typeof binnacleTickets.$inferSelect
export type NewBinnacleTicket = typeof binnacleTickets.$inferInsert
export type BinnacleMessage = typeof binnacleMessages.$inferSelect
export type NewBinnacleMessage = typeof binnacleMessages.$inferInsert
export type BinnacleEvent = typeof binnacleEvents.$inferSelect
export type BinnacleCanned = typeof binnacleCanned.$inferSelect
export type BinnacleMacro = typeof binnacleMacros.$inferSelect
export type BinnacleView = typeof binnacleViews.$inferSelect
export type BinnacleSla = typeof binnacleSlas.$inferSelect
export type BinnacleAutomation = typeof binnacleAutomations.$inferSelect
export type BinnacleArticle = typeof binnacleArticles.$inferSelect
export type BinnacleCsat = typeof binnacleCsat.$inferSelect
export type BinnacleFolder = typeof binnacleFolders.$inferSelect


export const binnacleMessagesRelations = relations(binnacleMessages, ({ one }) => ({
  ticket: one(binnacleTickets, { fields: [binnacleMessages.ticketId], references: [binnacleTickets.id] }),
}))


export const binnacleViews = pgTable(
  "binnacle_views",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    slug: text("slug").notNull(),
    /** Structured clauses, never raw SQL — a view must not read another tenant. */
    filters: jsonb("filters").$type<{ field: string; op: string; value: unknown }[]>().notNull().default([]),
    sort: text("sort").notNull().default("activity"),
    isSystem: boolean("is_system").notNull().default(false),
    position: integer("position").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("binnacle_views_tenant_slug_idx").on(table.tenantId, table.slug),
    index("binnacle_views_tenant_idx").on(table.tenantId),
  ],
)


/**
 * Rate limiting for public endpoints.
 *
 * A table rather than an in-memory counter because this runs on serverless: an
 * in-process counter is per-instance, so the real ceiling is `limit × instance
 * count` and rises exactly when the platform scales out. One row per
 * (tenant, scope, client), overwritten rather than appended, so the table is
 * bounded by distinct callers and not by request volume.
 */
export const binnacleRateLimits = pgTable(
  "binnacle_rate_limits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    clientKey: text("client_key").notNull(),
    scope: text("scope").notNull().default("intake"),
    hits: integer("hits").notNull().default(0),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("binnacle_rate_limits_bucket_idx").on(table.tenantId, table.scope, table.clientKey)],
)

export type BinnacleRateLimit = typeof binnacleRateLimits.$inferSelect
