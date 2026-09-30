import { pgTable, text, uuid, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { tenants } from "./tenants"

// Digital Asset Management
export const assets = pgTable("assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),

  // Basic info
  ownerUserId: text("owner_user_id"),
  uploadedById: text("uploaded_by_id"),
  appKey: text("app_key"),
  storageKey: text("storage_key"),
  uploadKey: text("upload_key").unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  trashedAt: timestamp("trashed_at", { withTimezone: true }),
  trashReason: text("trash_reason"),
  name: text("name").notNull(),
  description: text("description"),

  // File info
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"), // bytes
  width: integer("width"), // for images
  height: integer("height"), // for images

  // Organization
  folder: text("folder"), // virtual folder path
  tags: jsonb("tags").$type<string[]>(),
  category: text("category"), // "image", "video", "document", "audio"

  // Source tracking
  source: text("source").default("url"), // "url" | "upload"
  originalFilename: text("original_filename"),

  // Alt text for accessibility/SEO
  altText: text("alt_text"),

  // Usage tracking
  usageCount: integer("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const assetsRelations = relations(assets, ({ one }) => ({
  tenant: one(tenants, {
    fields: [assets.tenantId],
    references: [tenants.id],
  }),
}))

export type Asset = typeof assets.$inferSelect
export type NewAsset = typeof assets.$inferInsert

export const assetFolders = pgTable("asset_folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  libraryId: text("library_id").notNull(),
  tenantId: uuid("tenant_id"),
  ownerUserId: text("owner_user_id"),
  path: text("path").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  trashedAt: timestamp("trashed_at", { withTimezone: true }),
  trashReason: text("trash_reason"),
});
export const folderGrants = pgTable("folder_grants", {
  id: uuid("id").primaryKey().defaultRandom(),
  folderId: uuid("folder_id").notNull(),
  recipientUserId: text("recipient_user_id"),
  recipientTenantId: uuid("recipient_tenant_id"),
  canRead: boolean("can_read").notNull().default(true),
  canUpload: boolean("can_upload").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});
export const assetAppGrants = pgTable("asset_app_grants", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetId: uuid("asset_id").notNull(),
  appKey: text("app_key").notNull(),
  recordId: uuid("record_id").notNull(),
  audienceTenantId: uuid("audience_tenant_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const foldersUploadIntents = pgTable("folders_upload_intents", {
 id: uuid("id").primaryKey().defaultRandom(), appKey:text("app_key").notNull(), recordId:uuid("record_id").notNull(), audienceTenantId:uuid("audience_tenant_id").notNull(), userId:text("user_id").notNull(), libraryId:text("library_id").notNull(), folder:text("folder"), expiresAt:timestamp("expires_at",{withTimezone:true}).notNull(), assetExpiresAt:timestamp("asset_expires_at",{withTimezone:true}), createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
});

export const assetOwnershipEvents = pgTable("asset_ownership_events", {
 id:uuid("id").primaryKey().defaultRandom(),assetId:uuid("asset_id").notNull(),actorUserId:text("actor_user_id").notNull(),fromTenantId:uuid("from_tenant_id"),fromOwnerUserId:text("from_owner_user_id"),toTenantId:uuid("to_tenant_id"),toOwnerUserId:text("to_owner_user_id"),createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
});

export const folderStorageCleanup = pgTable("folder_storage_cleanup", {
 storageKey:text("storage_key").primaryKey(),attempts:integer("attempts").notNull().default(0),lastError:text("last_error"),nextAttemptAt:timestamp("next_attempt_at",{withTimezone:true}).notNull().defaultNow(),createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
});
