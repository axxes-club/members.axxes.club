/**
 * Vitrine — the collection engine.
 *
 * WHY THIS IS NOT A PRODUCTS TABLE WITH EXTRA COLUMNS
 *
 * `products` and `artwork_details` describe what a work IS: medium, dimensions,
 * year, edition. That is the right shape for a catalogue and the wrong shape for
 * a collection, because a collection is not a pile of objects — it is a sequence
 * of things that happened to objects.
 *
 * A work is accessioned. It is insured at a value on a date. It travels to a
 * lender and comes back. It is examined, treated. It is valued again two years
 * later at a different number. It is offered, declined, offered again. Eventually
 * it is deaccessioned and given to a museum.
 *
 * Each is a dated fact about one work by one party. Modelling them as columns on
 * the work destroys the two things that make a record defensible: WHEN a
 * statement was true, and WHO stood behind it. Insurance needs the value as at a
 * date. A condition report describes a moment, not an object. A claim needs the
 * appraisal in force on the day.
 *
 * So `vitrine_events` is append-only and everything hangs off an event or off
 * the work. This is the CIDOC CRM shape — E5 Event with E8 Acquisition, E9 Move,
 * E10 Transfer of Custody, E11 Modification, E14 Condition Assessment, E6
 * Destruction — reduced to what an administrator actually types, not modelled
 * for its own sake.
 *
 * FOUR RULES, THE SAME FOUR THE MATTERS ENGINE KEEPS
 *
 * 1. Nothing is edited to undo a mistake; a correction is a new event that
 *    supersedes the old one. An insurance schedule is a legal document, and a row
 *    that can be quietly rewritten is a row that cannot be relied on.
 * 2. No uniqueness on (work, kind, date). Two people recording the same movement
 *    is a reconciliation, not a violation.
 * 3. Nothing in the ledger deletes. `superseded_by` retires a wrong entry and it
 *    stays readable forever.
 * 4. A work is never hard-deleted either. `deaccessioned_at` moves it out of the
 *    active collection while keeping the record, because "we no longer own it"
 *    and "it never existed" are different claims.
 *
 * MONEY IS MINOR UNITS, ALWAYS. Insurance values run to six figures and are
 * compared across years. A float is not a currency.
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  jsonb,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { tenants } from "./tenants"

/** How a work leaves the collection. The reasons a museum is required to record. */
export const DEACCESSION_METHODS = [
  "sale",
  "private_sale",
  "gift",
  "bequest",
  "exchange",
  "loan_permanent",
  "return_to_artist",
  "lost",
  "destroyed",
] as const

/** The state a work is in. Drives what the desk shows and what can be done to it. */
export const WORK_STATUSES = [
  "draft", // being catalogued, not yet accessioned
  "active", // owned and held
  "on_loan", // lent out, currently elsewhere
  "deposit", // placed long-term, not owned outright
  "deaccessioned", // no longer owned; record retained
  "missing", // owned but not located
] as const

/**
 * The ledger.
 *
 * One row per dated, attributable fact about one work. `kind` is the CIDOC event
 * class; the typed tables hang off it and add the fields only that kind has. The
 * generic `detail` column means a kind nobody has thought of yet is still
 * recordable without a migration.
 */
export const vitrineEvents = pgTable(
  "vitrine_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    workId: uuid("work_id").notNull(),

    /** acquisition | movement | condition | valuation | loan | exhibition | conservation | deaccession | note */
    kind: text("kind").notNull(),

    /** The date the fact is about — not the date it was typed. */
    occurredOn: text("occurred_on").notNull(),
    /** Free text when the date is partial: "c. 1998", "before 1960". */
    occurredOnText: text("occurred_on_text"),

    title: text("title"),
    notes: text("notes"),
    detail: jsonb("detail").$type<Record<string, unknown>>().default({}),

    /**
     * Who made this record. Denormalised because a record outlives the account
     * that made it, exactly as in the matters engine.
     */
    actorKey: text("actor_key").notNull(),
    actorName: text("actor_name"),

    /**
     * Retirement, not deletion. A superseded row stays readable: it is the
     * evidence that a correction was made and when it was made.
     */
    supersededBy: uuid("superseded_by"),
    supersededReason: text("superseded_reason"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vitrine_events_work_idx").on(t.workId),
    index("vitrine_events_tenant_idx").on(t.tenantId),
    index("vitrine_events_kind_idx").on(t.tenantId, t.kind),
    // No uniqueness on (work, kind, date) — see rule 2.
  ]
)

/**
 * Works as this collection holds them.
 *
 * Not a copy of the catalogue. `artwork_details` is what the work IS; this is
 * what the collection has DONE with it. Both are needed and they are allowed to
 * disagree — a work whose catalogue entry is wrong is still a work the
 * collection owns, and the ownership history must not be hostage to a typo.
 */
export const vitrineWorks = pgTable(
  "vitrine_works",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    /** The catalogue row this manages, when the work has one. */
    productId: uuid("product_id"),
    artistId: uuid("artist_id"),

    /** The collection's own number, not the artist's. Unique per collection. */
    accession: text("accession").notNull(),
    title: text("title"),

    status: text("status").notNull().default("draft"),

    /** Current location, denormalised for the index. The ledger keeps the history. */
    location: text("location"),
    locationKind: text("location_kind"), // home | lender | museum | storage | gallery | unknown

    /** Value last assessed, minor units. The dated series is in vitrine_valuations. */
    insuredValueCents: integer("insured_value_cents"),
    currency: text("currency").default("USD"),

    /** True while the work is physically present in the collection. */
    onSite: boolean("on_site").default(true),

    deaccessionedAt: timestamp("deaccessioned_at", { withTimezone: true }),
    deaccessionMethod: text("deaccession_method"),
    deaccessionNotes: text("deaccession_notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("vitrine_works_accession_idx").on(t.tenantId, t.accession),
    index("vitrine_works_tenant_idx").on(t.tenantId),
    index("vitrine_works_product_idx").on(t.productId),
    index("vitrine_works_artist_idx").on(t.artistId),
  ]
)

/**
 * Where a work is.
 *
 * Locations are records, not an enum, because a collector's storage is not
 * "storage" — it is a room in a house, and a loss in transit is only
 * investigable if the address was written down.
 */
export const vitrineLocations = pgTable(
  "vitrine_locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    kind: text("kind").notNull(), // home | storage | gallery | lender | museum | vault | other
    address: text("address"),
    contactName: text("contact_name"),
    contactPhone: text("contact_phone"),
    contactEmail: text("contact_email"),

    /** Matters for works on paper and anything in tempera. */
    climateControlled: boolean("climate_controlled"),
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("vitrine_locations_tenant_idx").on(t.tenantId)]
)

/**
 * Valuations, over time.
 *
 * A collection's value is a series, not a number. An insurer, an estate and a
 * buyer each need the figure as at their own date, and a collection storing only
 * "current value" cannot answer any of them.
 */
export const vitrineValuations = pgTable(
  "vitrine_valuations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

    /** Minor units. See the header: a float is not a currency. */
    workId: uuid("work_id").notNull(),
    valueCents: integer("value_cents").notNull(),
    currency: text("currency").notNull().default("USD"),

    /**
     * Which question this value answers. An insurance figure and a fair-market
     * figure are not interchangeable and must never be summed together.
     */
    basis: text("basis").notNull(), // insurance | fair_market | auction_estimate | sale | appraisal

    valuedOn: text("valued_on").notNull(),
    valuer: text("valuer"),
    valuationFirm: text("valuation_firm"),
    reference: text("reference"),
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vitrine_valuations_work_idx").on(t.workId),
    index("vitrine_valuations_tenant_idx").on(t.tenantId),
  ]
)

/**
 * Condition reports.
 *
 * A condition report is a statement about a moment, by someone, with
 * photographs. It is never "the condition" — it is the condition as observed on
 * a date. Two reports a year apart are how damage, instability or improvement
 * becomes visible, which is the whole reason to keep them.
 */
export const vitrineConditions = pgTable(
  "vitrine_conditions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    workId: uuid("work_id").notNull(),
    eventId: uuid("event_id"),

    observedOn: text("observed_on").notNull(),
    observedBy: text("observed_by"),
    /** excellent | good | fair | poor | critical */
    grade: text("grade"),

    summary: text("summary"),
    /** Per-area: surface, structure, frame, mount. */
    detail: jsonb("detail").$type<{ area: string; note: string }[]>().default([]),
    images: jsonb("images").$type<{ url: string; caption?: string }[]>().default([]),

    /** Treatment carried out at this inspection, if any. */
    treated: boolean("treated").default(false),
    treatedBy: text("treated_by"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vitrine_conditions_work_idx").on(t.workId),
    index("vitrine_conditions_tenant_idx").on(t.tenantId),
  ]
)

/**
 * Loans, in and out.
 *
 * Both directions share a table because a collection both borrows and lends, and
 * the paperwork each side needs is the same paperwork. The condition report at
 * each end is not decoration: a lender's agreement almost always requires one
 * before the work leaves and one when it returns.
 */
export const vitrineLoans = pgTable(
  "vitrine_loans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    workId: uuid("work_id").notNull(),

    /** out = this collection lends it. in = this collection borrows it. */
    direction: text("direction").notNull(),

    counterparty: text("counterparty").notNull(), // museum, gallery, estate
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),

    startsOn: text("starts_on").notNull(),
    endsOn: text("ends_on"),

    /** Value declared for transit, minor units. */
    insuranceValueCents: integer("insurance_value_cents"),
    currency: text("currency").default("USD"),
    insurancePolicy: text("insurance_policy"),

    /** out_going | out_returned | in_going | in_returned | overdue | lost */
    status: text("status").notNull().default("out_going"),

    conditionOut: uuid("condition_out"),
    conditionIn: uuid("condition_in"),

    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vitrine_loans_work_idx").on(t.workId),
    index("vitrine_loans_tenant_idx").on(t.tenantId),
    index("vitrine_loans_status_idx").on(t.tenantId, t.status),
  ]
)

/**
 * Showings.
 *
 * A showing is not an exhibition: a private viewing, a fair stand and a museum
 * hang are different events with different paperwork. They share a table because
 * they answer the same question — which works left, when, and came back when.
 */
export const vitrineShowings = pgTable(
  "vitrine_showings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    /** exhibition | fair | viewing | museum_deposit | private | sale */
    kind: text("kind").notNull().default("exhibition"),
    venue: text("venue"),
    city: text("city"),
    country: text("country"),

    opensOn: text("opens_on"),
    closesOn: text("closes_on"),
    catalogueReference: text("catalogue_reference"),

    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("vitrine_showings_tenant_idx").on(t.tenantId)]
)

/** Which works were in which showing, and in what role. */
export const vitrineShowingWorks = pgTable(
  "vitrine_showing_works",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    showingId: uuid("showing_id").notNull().references(() => vitrineShowings.id, { onDelete: "cascade" }),
    workId: uuid("work_id").notNull(),

    /** exhibited | loaned_in | listed | sold_from */
    role: text("role").notNull().default("exhibited"),
    /** Wall label as hung, which is not always the catalogue title. */
    displayTitle: text("display_title"),
    /** Position on the wall or in the catalogue, for reconstruction. */
    position: text("position"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vitrine_showing_works_showing_idx").on(t.showingId),
    index("vitrine_showing_works_work_idx").on(t.workId),
  ]
)

/**
 * Provenance.
 *
 * A chain of ownership as discrete claims. Each row is a statement with a
 * source, because provenance that cannot be sourced is a story. A claim with no
 * source is allowed — plenty of real provenance is oral — but it is marked
 * `asserted` and weighted accordingly rather than quietly dropped.
 */
export const vitrineProvenance = pgTable(
  "vitrine_provenance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    workId: uuid("work_id").notNull(),

    periodFrom: text("period_from"),
    periodTo: text("period_to"),
    periodText: text("period_text"),

    ownerName: text("owner_name"),
    location: text("location"),
    /** purchase | gift | bequest | inheritance | unknown */
    transferType: text("transfer_type"),

    /** document | catalogue | letter | interview | oral. Null means asserted. */
    sourceType: text("source_type"),
    sourceReference: text("source_reference"),
    notes: text("notes"),

    /** A certainty a registrar can defend in a dispute. */
    certainty: text("certainty").default("attributed"), // documented | attributed | asserted | disputed

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vitrine_provenance_work_idx").on(t.workId),
    index("vitrine_provenance_tenant_idx").on(t.tenantId),
  ]
)

// --- relations -------------------------------------------------------------

export const vitrineWorksRelations = relations(vitrineWorks, ({ many }) => ({
  events: many(vitrineEvents),
  valuations: many(vitrineValuations),
  conditions: many(vitrineConditions),
  loans: many(vitrineLoans),
  provenance: many(vitrineProvenance),
}))

export const vitrineEventsRelations = relations(vitrineEvents, ({ one }) => ({
  work: one(vitrineWorks, { fields: [vitrineEvents.workId], references: [vitrineWorks.id] }),
}))

export const vitrineLoansRelations = relations(vitrineLoans, ({ one }) => ({
  work: one(vitrineWorks, { fields: [vitrineLoans.workId], references: [vitrineWorks.id] }),
}))

export const vitrineShowingsRelations = relations(vitrineShowings, ({ many }) => ({
  works: many(vitrineShowingWorks),
}))

export type VitrineWork = typeof vitrineWorks.$inferSelect
export type VitrineEvent = typeof vitrineEvents.$inferSelect
export type VitrineValuation = typeof vitrineValuations.$inferSelect
export type VitrineCondition = typeof vitrineConditions.$inferSelect
export type VitrineLoan = typeof vitrineLoans.$inferSelect
export type VitrineShowing = typeof vitrineShowings.$inferSelect
export type VitrineProvenance = typeof vitrineProvenance.$inferSelect
export type VitrineLocation = typeof vitrineLocations.$inferSelect
