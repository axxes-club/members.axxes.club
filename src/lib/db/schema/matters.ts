import { pgTable, text, timestamp, uuid, integer, jsonb, boolean, index, uniqueIndex } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { tenants } from "./tenants"
import { user } from "./users"

/**
 * AXXES Matter.
 *
 * One engine, two templates. A "matter" is a thing being settled over time by
 * a group of people who do not all have the same authority: a family and its
 * lawyers, or the owners of a business and the people buying it out.
 *
 * WHY THIS IS NOT A PROJECT
 *
 * The platform already has projects, cards, checklists and deadlines, and a
 * matter is deliberately NOT modelled as a project, for one reason: documents.
 * In a project, a file is an attachment. In a matter, the file is the subject,
 * and the question that matters is not "is this done" but "has everyone seen
 * this, and what did they say about it". That is `matter_acks`, and it is the
 * reason this product exists. See the note on that table before changing it.
 *
 * EVERYTHING HERE IS APPEND-OR-CORRECT-FORWARD
 *
 * No row in this file is edited to undo a mistake; a correction is a new row.
 * That is already the house rule in the inventory ledger ("mistakes reversed
 * rather than edited"), and it stops being a stylistic preference the moment a
 * document has been seen by somebody's lawyer.
 *
 * ACTORS
 *
 * A participant is a signed-in AXXES user OR a guest reached through a signed
 * share link — opposing counsel, a notary, an accountant who was never going to
 * create an account. Every table therefore carries a denormalised `actor_key`
 * ("user:<id>" or "guest:<subject>") and `actor_name` rather than only a
 * user_id, so an acknowledgement made by a guest is as durable as one made by
 * the executor. Vibez set this precedent: access is keyed on a subject, not on
 * an account.
 */

/** Which template a matter was started from. Two rows exist; see matter_templates. */
export const matterTemplates = pgTable(
  "matter_templates",
  {
    key: text("key").primaryKey(),
    name: text("name").notNull(),
    blurb: text("blurb").notNull(),
    description: text("description").notNull(),

    /** matter kind -> label, offered as choices in the wizard. */
    kinds: jsonb("kinds").$type<{ key: string; label: string }[]>().notNull().default([]),
    /** role -> label, pre-filled into the participant list. */
    defaultRoles: jsonb("default_roles").$type<{ role: string; label: string }[]>().notNull().default([]),
    /** Pre-loaded into matter_deadlines so a new matter opens with a real plan. */
    defaultDeadlines: jsonb("default_deadlines")
      .$type<{ title: string; kind: string; offsetDays: number }[]>()
      .notNull()
      .default([]),

    icon: text("icon"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("matter_templates_sort_idx").on(table.sortOrder)],
)

export type MatterTemplate = typeof matterTemplates.$inferSelect

/** A single case. Family succession and business succession are both this. */
export const matters = pgTable(
  "matters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

    templateKey: text("template_key").references(() => matterTemplates.key),
    /** will | trust | property | probate | business | buyout | shareholder */
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),

    /** collecting | reviewing | agreed | filed | closed */
    stage: text("stage").notNull().default("collecting"),
    jurisdiction: text("jurisdiction"),

    /** When the clock started. Filing deadlines are counted from here. */
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),

    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("matters_tenant_idx").on(table.tenantId),
    index("matters_stage_idx").on(table.tenantId, table.stage),
    index("matters_template_idx").on(table.templateKey),
  ],
)

/**
 * Who is in the matter, and in what capacity.
 *
 * `role` is the thing that actually matters here and it is NOT team_role. Being
 * an `owner` of a tenant says you can delete the workspace. Being an `executor`
 * says you are legally responsible for the estate. They are different axes, and
 * conflating them is how a firm ends up with a nephew who can file nothing.
 *
 * `canViewAll = false` is the honest placeholder for per-heir privacy. AXXES has
 * no row-level security anywhere, so today it is a label on a person and nothing
 * more — it does NOT restrict what they can open. It exists now so the data is
 * right on day one; enforcing it is real work and is not claimed here.
 */
export const matterParticipants = pgTable(
  "matter_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matterId: uuid("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

    /** Null for a guest reached by share link. See actor_key. */
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    /** "user:<id>" or "guest:<subject>" — stable identity either way. */
    actorKey: text("actor_key").notNull(),
    displayName: text("display_name").notNull(),
    /** executor | heir | beneficiary | counsel | accountant | notary | owner | observer */
    role: text("role").notNull(),
    /** Firm or practice, e.g. "Rosales & Vega LLP". Free text; people spell it ten ways. */
    org: text("org"),
    email: text("email"),

    /** NOT enforced. See the table note. */
    canViewAll: boolean("can_view_all").notNull().default(true),

    invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("matter_participants_actor_idx").on(table.matterId, table.actorKey),
    index("matter_participants_matter_idx").on(table.matterId),
    index("matter_participants_tenant_idx").on(table.tenantId),
  ],
)

/**
 * A document the matter is actually about.
 *
 * A document is backed by a real file. `assetId` points at the shared `assets`
 * table (the DAM), so the same file is reachable from Folders and from a signed
 * share link without a second copy existing. `revision` is the version this
 * row is currently at, and it is what `matter_acks` refers to.
 */
export const matterDocuments = pgTable(
  "matter_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matterId: uuid("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    /** asset | office_document | external_link */
    kind: text("kind").notNull().default("asset"),
    assetId: uuid("asset_id"),
    /** Bumped whenever the underlying file is replaced. Acks are pinned to this. */
    revision: integer("revision").notNull().default(1),

    /** draft | in_review | agreed | executed | superseded */
    status: text("status").notNull().default("draft"),
    /** Short plain-language note on what this document is and what it settles. */
    purpose: text("purpose"),

    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("matter_documents_matter_idx").on(table.matterId),
    index("matter_documents_tenant_idx").on(table.tenantId),
    index("matter_documents_status_idx").on(table.matterId, table.status),
  ],
)

/**
 * ★ THE ACKNOWLEDGEMENT LEDGER — the reason this product exists.
 *
 * One row: a named person, a specific document, a specific revision of it, and
 * a decision with a timestamp. It answers the only question that matters in a
 * room where lawyers are present — "did she actually see version three, and
 * what did she say about it?" — with an answer that can be printed.
 *
 * THREE RULES. BREAKING ANY OF THEM BREAKS THE PRODUCT.
 *
 * 1. THE REVISION IS PART OF THE KEY.
 *    An ack says "I approved v3". It does NOT say "I approved this document".
 *    The moment v4 exists, a document-level ack would silently become a lie.
 *    This is why `revision` is here and why the UI always shows it.
 *
 * 2. APPEND ONLY. NO UNIQUE CONSTRAINT ON (document, revision, actor).
 *    The obvious thing to add is a unique index so one person cannot approve the
 *    same revision twice. Do not. A person who changes their mind is not a bug;
 *    if you make them fight the database to say so, they will instead say
 *    nothing at all, and a silent person is the failure this product exists to
 *    prevent. Every decision is kept. The current one is the latest by
 *    `decidedAt` — see `latestAcks()` in the actions. History is the feature.
 *
 * 3. NOTHING HERE IS EVER DELETED.
 *    `matter_documents` soft-deletes so a superseded file stops appearing in
 *    the list. This table has no deleted_at, on purpose. There is no code path
 *    that removes an acknowledgement, and adding one is the one change to this
 *    product that should be decided outside a sprint.
 */
export const matterAcks = pgTable(
  "matter_acks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id").notNull().references(() => matterDocuments.id, { onDelete: "cascade" }),
    matterId: uuid("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),

    /** Pinned. See rule 1. */
    revision: integer("revision").notNull(),

    actorKey: text("actor_key").notNull(),
    actorName: text("actor_name").notNull(),
    /** Denormalised on purpose: a role change later must not rewrite history. */
    actorRole: text("actor_role"),

    /** viewed | approved | changes_requested | rejected */
    decision: text("decision").notNull(),
    /** The objection, in their words. Required for changes_requested and rejected. */
    note: text("note"),

    decidedAt: timestamp("decided_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("matter_acks_document_idx").on(table.documentId, table.revision),
    index("matter_acks_matter_idx").on(table.matterId),
    index("matter_acks_actor_idx").on(table.actorKey),
    index("matter_acks_decided_idx").on(table.decidedAt),
  ],
)

/**
 * A date that matters, owned by the matter rather than borrowed from `events`.
 *
 * `events` is nightlife-shaped — venue, doors, ticket types, minimum age — and
 * reusing it for "petition due in 14 days" would be a lie about what the table
 * is. These are counted from `matters.openedAt`, not created ad hoc, so a new
 * matter opens with a plan instead of an empty screen.
 */
export const matterDeadlines = pgTable(
  "matter_deadlines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matterId: uuid("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    /** filing | notary | court | review | tax | valuation | other */
    kind: text("kind").notNull().default("other"),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),

    actorKey: text("actor_key"),
    actorName: text("actor_name"),

    /** open | done | missed */
    status: text("status").notNull().default("open"),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("matter_deadlines_matter_idx").on(table.matterId),
    index("matter_deadlines_tenant_idx").on(table.tenantId),
    index("matter_deadlines_due_idx").on(table.dueAt),
  ],
)

/**
 * A job somebody owes, with a name against it.
 *
 * Separate from deadlines on purpose. A deadline is a date the court set; a task
 * is "get the birth certificates to Rosa". Confusing them produces a calendar
 * full of things nobody is doing, which is the failure mode every family
 * spreadsheet has already hit once.
 */
export const matterTasks = pgTable(
  "matter_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matterId: uuid("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    detail: text("detail"),

    actorKey: text("actor_key"),
    actorName: text("actor_name"),

    /** open | done | blocked */
    status: text("status").notNull().default("open"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedByName: text("completed_by_name"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("matter_tasks_matter_idx").on(table.matterId),
    index("matter_tasks_tenant_idx").on(table.tenantId),
    index("matter_tasks_assignee_idx").on(table.actorKey),
  ],
)

/**
 * The conversation, borrowed rather than rebuilt.
 *
 * A matter does not have its own message store. A row here points at a row in
 * the existing `conversations` table, so the same thread that runs beside the
 * case also appears in Relay with the same read receipts. Two message stores
 * would be the first genuinely bad decision available to us here.
 */
export const matterThreads = pgTable(
  "matter_threads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matterId: uuid("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").notNull(),
    label: text("label"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("matter_threads_matter_idx").on(table.matterId),
    index("matter_threads_conversation_idx").on(table.conversationId),
  ],
)

export const mattersRelations = relations(matters, ({ one, many }) => ({
  tenant: one(tenants, { fields: [matters.tenantId], references: [tenants.id] }),
  template: one(matterTemplates, { fields: [matters.templateKey], references: [matterTemplates.key] }),
  documents: many(matterDocuments),
  participants: many(matterParticipants),
  deadlines: many(matterDeadlines),
  tasks: many(matterTasks),
}))

export const matterDocumentsRelations = relations(matterDocuments, ({ one, many }) => ({
  matter: one(matters, { fields: [matterDocuments.matterId], references: [matters.id] }),
  acks: many(matterAcks),
}))

export const matterAcksRelations = relations(matterAcks, ({ one }) => ({
  document: one(matterDocuments, { fields: [matterAcks.documentId], references: [matterDocuments.id] }),
}))

export type Matter = typeof matters.$inferSelect
export type NewMatter = typeof matters.$inferInsert
export type MatterDocument = typeof matterDocuments.$inferSelect
export type MatterAck = typeof matterAcks.$inferSelect
export type MatterParticipant = typeof matterParticipants.$inferSelect
export type MatterDeadline = typeof matterDeadlines.$inferSelect
export type MatterTask = typeof matterTasks.$inferSelect
