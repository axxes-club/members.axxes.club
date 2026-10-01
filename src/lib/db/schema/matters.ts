import { sql } from "drizzle-orm"
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
    /**
     * What KIND of legal document this is, which decides how it may be signed.
     *
     * This is not a label. `wills`, `codicils` and `trusts` are excluded from
     * electronic signature by ESIGN 101(c) and the UETA, and only a handful of
     * states permit an e-will by separate statute. A signature flow that does
     * not know this will cheerfully produce a defective will and call it
     * signed. See SIGNABLE_KINDS in src/lib/matters/shared.ts.
     */
    /** will | codicil | trust | deed | appraisal | correspondence | filing | tax | financial | other */
    documentType: text("document_type").notNull().default("other"),
    assetId: uuid("asset_id"),
    /** Bumped whenever the underlying file is replaced. Acks are pinned to this. */
    revision: integer("revision").notNull().default(1),

    /**
     * Who may see this at all.
     *
     *   participants  everyone in the matter (the default)
     *   restricted    only people holding an explicit grant
     *   counsel_only  the executor and counsel, not the beneficiaries
     *
     * `restricted` and `counsel_only` are enforced in assertCanViewDocument().
     * A person without access does not merely get a 403 on the document page —
     * its TITLE is withheld from lists, search and notifications too, because
     * the filename is the leak. See redactFor().
     */
    visibility: text("visibility").notNull().default("participants"),
    /** Whether a viewer may save the file. Reading online is not having it. */
    allowDownload: boolean("allow_download").notNull().default(true),
    /**
     * SHA-256 of the file this revision points at.
     *
     * Two jobs. It is the integrity half of ESIGN: a signature proves what was
     * signed, and the hash is how you prove the file has not changed since. It
     * is also how a wet-ink signing packet is matched back to the record — the
     * hash is printed on the page the person signs, so a scanned original can
     * be tied to the exact revision.
     */
    sha256: text("sha256"),
    /** Set when a newer revision replaces this one. The row is kept, never deleted. */
    supersededById: uuid("superseded_by_id"),
    /** Bytes and mime, denormalised so a list can show them without a join. */
    fileName: text("file_name"),
    fileSize: integer("file_size"),
    mimeType: text("mime_type"),
    /** Extracted text, so documents are searchable. Null until OCR has run. */
    extractedText: text("extracted_text"),
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
    index("matter_documents_visibility_idx").on(table.matterId, table.visibility),
  ],
)

/**
 * ★ THE ACCESS CONTROL. This table is why the product can be called private.
 *
 * A grant is an explicit permission for one person over one thing. Absence of a
 * grant is DENIAL, not permission. That default is the whole design: a case
 * where you must add someone to see something is correct, and a case where
 * adding someone is how they get access is a leak.
 *
 * `documentId` null means the grant is for the whole matter; set, it is for
 * ONE document without the rest of the case. The second is the interesting one
 * — a beneficiary with a claim to one part of an estate, or opposing counsel
 * who needs the deed and nothing else, is a real situation, and there is
 * nowhere in this schema to put that without either inventing a second matter
 * (and two records that disagree) or opening the whole case.
 *
 * `matter_participants` is NOT this. A participant says who is IN the case and
 * in what legal capacity — executor, heir, counsel. A grant says who may SEE
 * something. A participant with no grant on a restricted document can know the
 * executor exists and still be unable to read the will. Those are different
 * facts and they live in different tables on purpose.
 *
 * Being in the matter is the implicit matter-wide grant: you can see
 * everything whose visibility is `participants`. A grant is how somebody who is
 * not in the matter — or who is, but should not see one particular document —
 * gets in.
 */
export const matterGrants = pgTable(
  "matter_grants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matterId: uuid("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

    /** Null means the grant covers the whole matter. */
    documentId: uuid("document_id").references(() => matterDocuments.id, { onDelete: "cascade" }),

    /** Same actor vocabulary as matter_acks: user:<id> or guest:<subject>. */
    actorKey: text("actor_key").notNull(),

    canView: boolean("can_view").notNull().default(true),
    /** May record an acknowledgement. Implies canView. */
    canAcknowledge: boolean("can_acknowledge").notNull().default(false),
    /** May sign. Refused for testamentary documents regardless — see SIGNABLE_KINDS. */
    canSign: boolean("can_sign").notNull().default(false),
    /** May hand out further grants. The executor, or nobody. */
    canManage: boolean("can_manage").notNull().default(false),

    /** Why this person was given this, in plain words. Shown in the access list. */
    reason: text("reason"),
    grantedByActorKey: text("granted_by_actor_key"),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),

    /** Revocation keeps the row. Who could see what, and who stopped, is both history. */
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedByActorKey: text("revoked_by_actor_key"),
    /** When it lapses on its own, e.g. a court-appointed representative. */
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("matter_grants_target_idx").on(table.matterId, table.documentId, table.actorKey).where(sql`${table.revokedAt} is null`),
    uniqueIndex("matter_grants_matter_actor_idx").on(table.matterId, table.actorKey).where(sql`${table.revokedAt} is null and ${table.documentId} is null`),
    index("matter_grants_actor_idx").on(table.actorKey),
    index("matter_grants_matter_idx").on(table.matterId),
    index("matter_grants_document_idx").on(table.documentId),
    index("matter_grants_tenant_idx").on(table.tenantId),
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

/**
 * ★ THE AUDIT TRAIL. Append-only. No update path, no delete path.
 *
 * Every consequential thing that happens in a matter is written here: who
 * looked at a document, who acknowledged it, who was granted access, who was
 * removed. For a product that will be asked to prove what a family and their
 * lawyers agreed to, this table is the difference between a record and a claim.
 *
 * It is written on the READ path too, not just writes. "Who saw the will, and
 * when" is a question this product exists to answer, and it cannot be answered
 * if viewing is not recorded. That costs one insert on document open, and it is
 * the most valuable row in the table.
 *
 * `ipAddress` and `userAgent` are here because the hard question in electronic
 * signature is not validity — that has been settled for twenty-five years — it
 * is attribution. Whoever is asked to rely on this record will be asked where
 * the person was and on what device.
 */
export const matterActivity = pgTable(
  "matter_activity",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matterId: uuid("matter_id").notNull().references(() => matters.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

    /** created | viewed | acknowledged | uploaded | revised | granted | revoked | signed | downloaded | exported | stage_changed */
    action: text("action").notNull(),
    documentId: uuid("document_id").references(() => matterDocuments.id, { onDelete: "set null" }),

    actorKey: text("actor_key").notNull(),
    actorName: text("actor_name"),
    /** Denormalised: a role change later must not rewrite what was true at the time. */
    actorRole: text("actor_role"),

    /** The decision, for an acknowledged action. Null otherwise. */
    decision: text("decision"),
    /** Free-text detail. Redacted for documents the actor could not see. */
    detail: text("detail"),
    target: text("target"),

    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("matter_activity_matter_idx").on(table.matterId, table.occurredAt),
    index("matter_activity_actor_idx").on(table.actorKey),
    index("matter_activity_document_idx").on(table.documentId),
    index("matter_activity_action_idx").on(table.matterId, table.action),
    index("matter_activity_tenant_idx").on(table.tenantId),
  ],
)

export const matterGrantsRelations = relations(matterGrants, ({ one }) => ({
  matter: one(matters, { fields: [matterGrants.matterId], references: [matters.id] }),
  document: one(matterDocuments, { fields: [matterGrants.documentId], references: [matterDocuments.id] }),
}))

export type MatterGrant = typeof matterGrants.$inferSelect
export type MatterActivity = typeof matterActivity.$inferSelect

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
