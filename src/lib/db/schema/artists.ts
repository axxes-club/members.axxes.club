import { pgTable, text, uuid, timestamp, boolean, integer, uniqueIndex, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { tenants } from "./tenants"

/**
 * Artists represented in a tenant's inventory.
 *
 * This is a first-class entity and deliberately not a product: a product is a
 * thing for sale with images, a price and stock. An artist is a person with a
 * biography, a lifespan, and a count of the works they have in the collection.
 * The original import conflated the two and stored ~591 biographies as
 * image-less products; see scripts/migrate_cr_artists.cjs.
 */
export const artists = pgTable("artists", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

  // Slug is the slug without the legacy "glossary/" prefix
  slug: text("slug").notNull(),
  name: text("name").notNull(),

  // Biography, in the language it was written in
  bio: text("bio"),

  // e.g. "Aibonito, 1946" — extracted from the bio, not free-form
  lifespan: text("lifespan"),

  // Denormalized count of products in the tenant attributed to this artist.
  // Kept as a number so the A–Z index can sort by activity without a join.
  artworkCount: integer("artwork_count").notNull().default(0),

  // Name with any leading article removed, for alphabetical ordering
  sortName: text("sort_name"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("artists_tenant_slug_idx").on(table.tenantId, table.slug),
  index("artists_tenant_idx").on(table.tenantId),
])

export const artistsRelations = relations(artists, ({ one }) => ({
  tenant: one(tenants, {
    fields: [artists.tenantId],
    references: [tenants.id],
  }),
}))

export type Artist = typeof artists.$inferSelect
export type NewArtist = typeof artists.$inferInsert
