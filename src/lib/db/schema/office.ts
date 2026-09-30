import { pgTable, text, timestamp, uuid, jsonb, boolean, integer, bigint, index, uniqueIndex, primaryKey } from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"
import { tenants } from "./tenants"
import { user } from "./users"
import { assets } from "./assets"

/**
 * AXXES Office.
 *
 * One table holds every kind of file — documents, sheets and decks — because
 * they are the same thing to a person ("a file in my workspace") and because
 * every surface that lists them (the portal, the DAM, the launcher) would
 * otherwise need to know about three shapes.
 *
 * `content` is the document body and is interpreted by the app that owns the
 * kind: block list for `doc`, cell map for `sheet`, slide list for `slides`.
 * Keeping it jsonb means adding an editor never needs a migration.
 */
export const officeDocuments = pgTable(
  "office_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

    /** doc | sheet | slides */
    kind: text("kind").notNull().default("doc"),
    title: text("title").notNull(),
    /** Free-text folder path, matching the DAM's `assets.folder` convention. */
    folder: text("folder"),

    content: jsonb("content").$type<Record<string, unknown>>().notNull().default({}),

    version: integer("version").notNull().default(1),

    /** draft | published | archived */
    status: text("status").notNull().default("draft"),
    starred: boolean("starred").notNull().default(false),

    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("office_documents_tenant_idx").on(table.tenantId),
    index("office_documents_kind_idx").on(table.tenantId, table.kind),
    index("office_documents_folder_idx").on(table.tenantId, table.folder),
    index("office_documents_updated_idx").on(table.tenantId, table.updatedAt),
    index("office_documents_created_by_idx").on(table.createdById),
  ],
)

/**
 * A point-in-time copy of `content`, written on demand and on a slow timer.
 * Restoring one is a copy forward, never a delete: the history stays intact.
 */
export const officeRevisions = pgTable(
  "office_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    documentId: uuid("document_id").notNull().references(() => officeDocuments.id, { onDelete: "cascade" }),

    content: jsonb("content").notNull(),
    title: text("title"),
    /** Short human note, e.g. "2 headings, 1 table". */
    summary: text("summary"),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("office_revisions_document_idx").on(table.documentId, table.createdAt),
    index("office_revisions_tenant_idx").on(table.tenantId),
  ],
)

/**
 * Ties a file in AXXES Folders to a record in another app, so the two can hand
 * off to each other: "Open in AXXES Office" from a folder, and a live editor
 * inside the folder's own preview.
 *
 * `app_key` is a catalog key ("office", "lanes", "nexus", …), not a table name.
 * Folders cannot join onto tables it does not own, so it holds the link and
 * resolves it through a small per-app URL registry — one mechanism for the whole
 * suite rather than a bespoke table per app.
 *
 * One record per app per asset: re-linking replaces the row instead of stacking
 * duplicates that would each claim to be the live one.
 */
export const assetAppLinks = pgTable(
  "asset_app_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
    /** Catalog key of the app that owns the record, e.g. "office". */
    appKey: text("app_key").notNull(),
    /** The record's id inside that app. */
    recordId: uuid("record_id").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("asset_app_links_asset_app_idx").on(table.assetId, table.appKey),
    uniqueIndex("office_asset_canonical_idx").on(table.tenantId, table.appKey, table.recordId).where(sql`${table.appKey} = 'office'`),
    index("asset_app_links_record_idx").on(table.appKey, table.recordId),
    index("asset_app_links_tenant_idx").on(table.tenantId),
  ],
)

export const assetAppLinksRelations = relations(assetAppLinks, ({ one }) => ({
  asset: one(assets, { fields: [assetAppLinks.assetId], references: [assets.id] }),
}))

export type AssetAppLink = typeof assetAppLinks.$inferSelect

export const officeDocumentsRelations = relations(officeDocuments, ({ one, many }) => ({
  tenant: one(tenants, { fields: [officeDocuments.tenantId], references: [tenants.id] }),
  author: one(user, { fields: [officeDocuments.createdById], references: [user.id] }),
  revisions: many(officeRevisions),
}))

export const officeRevisionsRelations = relations(officeRevisions, ({ one }) => ({
  document: one(officeDocuments, { fields: [officeRevisions.documentId], references: [officeDocuments.id] }),
  author: one(user, { fields: [officeRevisions.createdById], references: [user.id] }),
}))

export type OfficeDocument = typeof officeDocuments.$inferSelect
export type NewOfficeDocument = typeof officeDocuments.$inferInsert
export type OfficeRevision = typeof officeRevisions.$inferSelect

export const officeServiceRequests = pgTable("office_service_requests", {
 caller: text("caller").notNull(), requestId: text("request_id").notNull(),
 expiresAt: timestamp("expires_at", {withTimezone:true}).notNull(), createdAt: timestamp("created_at", {withTimezone:true}).notNull().defaultNow(),
}, table => [primaryKey({columns:[table.caller,table.requestId]}), index("office_service_requests_expiry_idx").on(table.expiresAt)])
export const officeUploads = pgTable("office_uploads", {
 id: uuid("id").primaryKey().defaultRandom(), requestId: text("request_id").notNull(),
 userId: text("user_id").notNull().references(()=>user.id), libraryId: text("library_id").notNull(),
 folder: text("folder"), name: text("name").notNull(), mimeType: text("mime_type").notNull(),
 size: bigint("size",{mode:"number"}).notNull(), storageKey: text("storage_key").unique(),assetId: uuid("asset_id"),
 expiresAt:timestamp("expires_at",{withTimezone:true}).notNull(), createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
}, table=>[uniqueIndex("office_uploads_user_request_idx").on(table.userId,table.requestId)])
