/**
 * Data adapter for converting between Members Portal schema and Puck format.
 * This enables seamless integration with your existing database.
 */

import type { Page, PageBlock, BlockType, BlockContent, BlockSettings } from "@/lib/db/schema"
import type { Data } from "@puckeditor/core"

// ============================================
// TYPE MAPPINGS
// ============================================

/**
 * Maps our block types to Puck component names
 */
const blockTypeToPuckComponent: Record<BlockType, string> = {
  hero: "HeroBlock",
  text: "TextBlock",
  heading: "HeadingBlock",
  image: "ImageBlock",
  gallery: "GalleryBlock",
  video: "VideoBlock",
  spacer: "SpacerBlock",
  divider: "DividerBlock",
  cta: "CTABlock",
  "artist-bio": "ArtistBioBlock",
  "music-links": "MusicLinksBlock",
  "social-links": "SocialLinksBlock",
  "tour-dates": "TourDatesBlock",
  "music-player": "MusicPlayerBlock",
  "events-list": "EventsListBlock",
  "event-card": "EventCardBlock",
  countdown: "CountdownBlock",
  "products-grid": "ProductsGridBlock",
  "product-card": "ProductCardBlock",
  "featured-products": "FeaturedProductsBlock",
  "contact-form": "ContactFormBlock",
  newsletter: "NewsletterBlock",
  map: "MapBlock",
  faq: "FAQBlock",
  testimonials: "TestimonialsBlock",
  html: "HTMLBlock",
}

/**
 * Maps Puck component names back to our block types
 */
const puckComponentToBlockType: Record<string, BlockType> = Object.fromEntries(
  Object.entries(blockTypeToPuckComponent).map(([k, v]) => [v, k as BlockType])
)

// ============================================
// CONVERSION FUNCTIONS
// ============================================

/**
 * Convert a single PageBlock to Puck component props
 */
export function blockToProps(block: PageBlock): Record<string, unknown> {
  const content = block.content as BlockContent
  const settings = block.settings as BlockSettings | undefined
  
  // Start with content as props
  const props: Record<string, unknown> = { ...content }
  
  // Flatten some settings into props if needed
  if (settings) {
    // Add custom classes
    if (settings.customClasses) {
      props.className = settings.customClasses
    }
    
    // Add visibility settings
    if (settings.hideOnMobile) {
      props.hideOnMobile = true
    }
    if (settings.hideOnDesktop) {
      props.hideOnDesktop = true
    }
  }
  
  return props
}

/**
 * Convert Puck component props back to block content
 */
export function propsToBlockContent(
  _type: BlockType,
  props: Record<string, unknown>
): BlockContent {
  // Remove non-content fields
   
  const { className: _className, hideOnMobile: _hideOnMobile, hideOnDesktop: _hideOnDesktop, ...content } = props
  
  return content as BlockContent
}

/**
 * Convert Puck component props to block settings
 */
export function propsToBlockSettings(
  props: Record<string, unknown>
): BlockSettings {
  const settings: BlockSettings = {}
  
  if (props.className) {
    settings.customClasses = props.className as string
  }
  if (props.hideOnMobile) {
    settings.hideOnMobile = true
  }
  if (props.hideOnDesktop) {
    settings.hideOnDesktop = true
  }
  
  return settings
}

// ============================================
// PAGE TO PUCK DATA
// ============================================

/**
 * Convert a Page with blocks to Puck Data format
 */
export function pageToPuckData(page: Page & { blocks: PageBlock[] }): Data {
  // Sort blocks by sortOrder
  const sortedBlocks = [...page.blocks].sort((a, b) => a.sortOrder - b.sortOrder)
  
  // Convert blocks to Puck content
  const content = sortedBlocks.map((block) => ({
    type: blockTypeToPuckComponent[block.type as BlockType],
    props: {
      ...blockToProps(block),
      id: block.id,
    },
  }))
  
  return {
    root: {
      props: {
        title: page.title,
      },
    },
    content,
    zones: {},
  } as Data
}

/**
 * Convert Puck Data back to blocks array
 */
export function puckDataToBlocks(data: Data): Array<{
  id: string
  type: BlockType
  content: BlockContent
  settings: BlockSettings
  sortOrder: number
}> {
  if (!data.content) return []
  
  return data.content.map((item, index) => {
    const type = puckComponentToBlockType[item.type] || "text"
    const { id, ...props } = item.props as Record<string, unknown>
    
    return {
      id: id as string || crypto.randomUUID(),
      type,
      content: propsToBlockContent(type, props),
      settings: propsToBlockSettings(props),
      sortOrder: index,
    }
  })
}

/**
 * Extract page updates from Puck root props
 */
export function puckDataToPageUpdates(data: Data): {
  title?: string
} {
  const rootProps = data.root?.props || {}
  
  return {
    title: rootProps.title as string | undefined,
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Create a new block with default content
 */
export function createDefaultBlock(
  type: BlockType,
  sortOrder: number = 0
): {
  type: BlockType
  content: BlockContent
  settings: BlockSettings
  sortOrder: number
} {
  const defaultContent: Record<BlockType, BlockContent> = {
    hero: { title: "Welcome", subtitle: "Your tagline here", alignment: "center" },
    text: { html: "<p>Enter your text here...</p>", alignment: "left" },
    heading: { text: "Section Title", level: "h2", alignment: "left" },
    image: { url: "", alt: "", size: "large" },
    gallery: { images: [], layout: "grid", columns: 3 },
    video: { url: "", autoplay: false, muted: true },
    spacer: { height: 64 },
    divider: { style: "solid", width: "full" },
    cta: { text: "Learn More", link: "#", style: "primary", size: "md", alignment: "center" },
    "artist-bio": { name: "", genres: [], bio: "", image: "" },
    "music-links": { platforms: [], style: "buttons" },
    "social-links": { platforms: [], style: "icons" },
    "tour-dates": { eventIds: [], showPast: false, limit: 5 },
    "music-player": { platform: "spotify", embedId: "", type: "track" },
    "events-list": { filter: "upcoming", limit: 6, showPast: false, layout: "cards" },
    "event-card": { eventId: "", style: "full" },
    countdown: { targetDate: "", title: "Coming Soon" },
    "products-grid": { categoryId: "", limit: 8, columns: 4 },
    "product-card": { productId: "", style: "full" },
    "featured-products": { productIds: [], layout: "grid" },
    "contact-form": { fields: [{ name: "email", type: "email", required: true }], submitText: "Send" },
    newsletter: { title: "Stay Updated", description: "Subscribe to our newsletter" },
    map: { address: "", zoom: 15, style: "standard" },
    faq: { items: [] },
    testimonials: { items: [], layout: "slider" },
    html: { code: "" },
  }
  
  return {
    type,
    content: defaultContent[type] || {},
    settings: {},
    sortOrder,
  }
}

/**
 * Validate that a block type is supported
 */
export function isValidBlockType(type: string): type is BlockType {
  return type in blockTypeToPuckComponent
}

/**
 * Get all supported block types
 */
export function getSupportedBlockTypes(): BlockType[] {
  return Object.keys(blockTypeToPuckComponent) as BlockType[]
}