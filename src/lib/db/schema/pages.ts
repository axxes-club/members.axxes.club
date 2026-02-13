import { pgTable, text, uuid, timestamp, jsonb, boolean, integer, uniqueIndex, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { tenants } from "./tenants"

// Block content types for type safety
export type HeroBlockContent = {
  title?: string
  subtitle?: string
  backgroundImage?: string
  backgroundVideo?: string
  ctaText?: string
  ctaLink?: string
  overlay?: boolean
  overlayOpacity?: number
  alignment?: "left" | "center" | "right"
}

export type TextBlockContent = {
  html: string
  alignment?: "left" | "center" | "right"
}

export type HeadingBlockContent = {
  text: string
  level: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
  alignment?: "left" | "center" | "right"
}

export type ImageBlockContent = {
  url: string
  alt?: string
  caption?: string
  link?: string
  size?: "small" | "medium" | "large" | "full"
}

export type GalleryBlockContent = {
  images: Array<{ url: string; alt?: string; caption?: string }>
  layout?: "grid" | "masonry" | "slider"
  columns?: number
}

export type VideoBlockContent = {
  url: string
  autoplay?: boolean
  muted?: boolean
  loop?: boolean
}

export type SpacerBlockContent = {
  height: number // in pixels
}

export type DividerBlockContent = {
  style?: "solid" | "dashed" | "dotted"
  width?: "full" | "half" | "third"
}

export type CTABlockContent = {
  text: string
  link: string
  style?: "primary" | "secondary" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
  alignment?: "left" | "center" | "right"
}

export type ArtistBioBlockContent = {
  name?: string
  genres?: string[]
  bio?: string
  image?: string
}

export type MusicLinksBlockContent = {
  platforms: Array<{
    name: string
    url: string
    icon?: string
  }>
  style?: "icons" | "buttons" | "list"
}

export type SocialLinksBlockContent = {
  platforms: Array<{
    name: string
    url: string
  }>
  style?: "icons" | "buttons"
}

export type TourDatesBlockContent = {
  eventIds?: string[]
  showPast?: boolean
  limit?: number
}

export type MusicPlayerBlockContent = {
  platform: "spotify" | "soundcloud" | "apple" | "youtube"
  embedId: string
  type?: "track" | "album" | "playlist"
}

export type EventsListBlockContent = {
  filter?: "upcoming" | "past" | "all"
  limit?: number
  showPast?: boolean
  layout?: "list" | "grid" | "cards"
}

export type EventCardBlockContent = {
  eventId: string
  style?: "full" | "compact" | "minimal"
}

export type CountdownBlockContent = {
  eventId?: string
  targetDate?: string
  title?: string
}

export type ProductsGridBlockContent = {
  categoryId?: string
  limit?: number
  columns?: number
}

export type ProductCardBlockContent = {
  productId: string
  style?: "full" | "compact" | "minimal"
}

export type FeaturedProductsBlockContent = {
  productIds: string[]
  layout?: "grid" | "slider" | "list"
}

export type ContactFormBlockContent = {
  fields: Array<{
    name: string
    type: "text" | "email" | "textarea" | "select"
    required?: boolean
    placeholder?: string
    options?: string[]
  }>
  submitText?: string
  recipientEmail?: string
}

export type NewsletterBlockContent = {
  title?: string
  description?: string
  provider?: "mailchimp" | "convertkit" | "custom"
  listId?: string
}

export type MapBlockContent = {
  address: string
  zoom?: number
  style?: "standard" | "dark" | "light"
}

export type FAQBlockContent = {
  items: Array<{
    question: string
    answer: string
  }>
}

export type TestimonialsBlockContent = {
  items: Array<{
    quote: string
    author: string
    role?: string
    image?: string
  }>
  layout?: "grid" | "slider" | "list"
}

export type HTMLBlockContent = {
  code: string
}

// Union type for all block content types
export type BlockContent =
  | HeroBlockContent
  | TextBlockContent
  | HeadingBlockContent
  | ImageBlockContent
  | GalleryBlockContent
  | VideoBlockContent
  | SpacerBlockContent
  | DividerBlockContent
  | CTABlockContent
  | ArtistBioBlockContent
  | MusicLinksBlockContent
  | SocialLinksBlockContent
  | TourDatesBlockContent
  | MusicPlayerBlockContent
  | EventsListBlockContent
  | EventCardBlockContent
  | CountdownBlockContent
  | ProductsGridBlockContent
  | ProductCardBlockContent
  | FeaturedProductsBlockContent
  | ContactFormBlockContent
  | NewsletterBlockContent
  | MapBlockContent
  | FAQBlockContent
  | TestimonialsBlockContent
  | HTMLBlockContent

// Block settings type
export type BlockSettings = {
  padding?: { top?: number; bottom?: number; left?: number; right?: number }
  margin?: { top?: number; bottom?: number }
  backgroundColor?: string
  backgroundImage?: string
  textColor?: string
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full"
  customClasses?: string
}

// Block type enum values
export const BLOCK_TYPES = [
  // Core blocks
  "hero",
  "text",
  "heading",
  "image",
  "gallery",
  "video",
  "spacer",
  "divider",
  "cta",
  // Artist/Talent blocks
  "artist-bio",
  "music-links",
  "social-links",
  "tour-dates",
  "music-player",
  // Event blocks
  "events-list",
  "event-card",
  "countdown",
  // Inventory/Merch blocks
  "products-grid",
  "product-card",
  "featured-products",
  // Utility blocks
  "contact-form",
  "newsletter",
  "map",
  "faq",
  "testimonials",
  "html",
] as const

export type BlockType = (typeof BLOCK_TYPES)[number]

// Pages table
export const pages = pgTable("pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

  // Page info
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),

  // SEO
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  ogImage: text("og_image"),

  // Status
  isPublished: boolean("is_published").default(false).notNull(),
  isHomepage: boolean("is_homepage").default(false).notNull(),

  // Settings
  showNavigation: boolean("show_navigation").default(true).notNull(),
  showFooter: boolean("show_footer").default(true).notNull(),

  // Order for navigation
  sortOrder: integer("sort_order").default(0).notNull(),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("pages_tenant_slug_idx").on(table.tenantId, table.slug),
  index("pages_tenant_idx").on(table.tenantId),
  index("pages_published_idx").on(table.tenantId, table.isPublished),
  index("pages_homepage_idx").on(table.tenantId, table.isHomepage),
])

// Page Blocks table
export const pageBlocks = pgTable("page_blocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

  // Block type
  type: text("type").notNull(), // 'hero', 'text', 'image', etc.

  // Block content (JSONB for flexibility)
  content: jsonb("content").$type<BlockContent>().notNull().default({}),

  // Block settings (JSONB)
  settings: jsonb("settings").$type<BlockSettings>().default({}),

  // Positioning
  sortOrder: integer("sort_order").notNull().default(0),

  // Visibility
  isVisible: boolean("is_visible").default(true).notNull(),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("page_blocks_page_idx").on(table.pageId),
  index("page_blocks_sort_idx").on(table.pageId, table.sortOrder),
  index("page_blocks_tenant_idx").on(table.tenantId),
])

// Relations
export const pagesRelations = relations(pages, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [pages.tenantId],
    references: [tenants.id],
  }),
  blocks: many(pageBlocks),
}))

export const pageBlocksRelations = relations(pageBlocks, ({ one }) => ({
  page: one(pages, {
    fields: [pageBlocks.pageId],
    references: [pages.id],
  }),
  tenant: one(tenants, {
    fields: [pageBlocks.tenantId],
    references: [tenants.id],
  }),
}))

// Types
export type Page = typeof pages.$inferSelect
export type NewPage = typeof pages.$inferInsert
export type PageBlock = typeof pageBlocks.$inferSelect
export type NewPageBlock = typeof pageBlocks.$inferInsert
