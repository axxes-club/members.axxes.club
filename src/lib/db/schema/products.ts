import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core"

/**
 * The AXXES product catalog.
 *
 * Every in-house app is a row here rather than a hard-coded array in some
 * component, because there are now several of them and they used to disagree:
 * Handshake shipped its own copy of this list, so an app could be live in one
 * place and missing from another with nothing to catch it. One table, read by
 * every app, is the whole point.
 *
 * It is deliberately NOT per-tenant: this is the list of things AXXES offers,
 * which is the same for everyone. What a given workspace may open is a
 * separate question, answered by `membersPath` and the workspace's own
 * permissions.
 */
export const axxesProduct = pgTable("axxes_product", {
  /** Stable identifier used by URLs and by other apps' config. Never changes. */
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  /** One line, shown under the name. */
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  /** Where the app itself lives. */
  url: text("url").notNull(),
  /** Brand colour, used for the tile. */
  color: text("color").notNull(),
  /** Suite | Work | Events | Commerce | Developers */
  category: text("category").notNull(),
  /** live = ready for customers, beta = usable, soon = announced. */
  status: text("status").notNull().default("beta"),
  /** Signs in with the shared AXXES account, so no second password. */
  sso: boolean("sso").notNull().default(false),
  /** lucide-react icon name, resolved in the UI. */
  icon: text("icon"),
  /**
   * Set when the portal has a surface of its own for this app, so the launcher
   * can offer "Open in portal" instead of sending the person out of the tab.
   * Null means the app is its own place.
   */
  membersPath: text("members_path"),
  /** Hidden from the launcher without deleting the row. */
  surfaceInMembers: boolean("surface_in_members").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export type AxxesProduct = typeof axxesProduct.$inferSelect
