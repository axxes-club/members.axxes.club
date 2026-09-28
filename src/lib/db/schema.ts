
// Handoff Sessions (for QR code camera uploads)
export const uploadSessions = pgTable("upload_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull().unique(),
  tenantId: uuid("tenant_id").notNull(),
  folder: text("folder"),
  createdById: text("created_by_id").notNull(),
  photos: jsonb("photos").$type<string[]>().default([]),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
