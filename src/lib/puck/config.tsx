"use client"

import type { Config } from "@puckeditor/core"
import {
  HeroBlock,
  SpacerBlock,
  DividerBlock,
  TextBlock,
  HeadingBlock,
  ImageBlock,
  GalleryBlock,
  VideoBlock,
  CTABlock,
  ArtistBioBlock,
  MusicLinksBlock,
  SocialLinksBlock,
  TourDatesBlock,
  MusicPlayerBlock,
  EventsListBlock,
  EventCardBlock,
  CountdownBlock,
  ProductsGridBlock,
  ProductCardBlock,
  FeaturedProductsBlock,
  ContactFormBlock,
  NewsletterBlock,
  MapBlock,
  FAQBlock,
  TestimonialsBlock,
  HTMLBlock,
} from "./components"

// ============================================
// FIELD COMPONENTS (Reusable field definitions)
// ============================================

const alignmentField = {
  type: "select" as const,
  options: [
    { label: "Left", value: "left" },
    { label: "Center", value: "center" },
    { label: "Right", value: "right" },
  ],
}

const sizeField = {
  type: "select" as const,
  options: [
    { label: "Small", value: "small" },
    { label: "Medium", value: "medium" },
    { label: "Large", value: "large" },
    { label: "Full Width", value: "full" },
  ],
}

// ============================================
// PUCK CONFIGURATION
// ============================================

export const puckConfig: Config = {
  root: {
    render: (props) => props.children,
  },
  components: {
    // Layout Blocks
    HeroBlock: {
      fields: {
        title: { type: "text" },
        subtitle: { type: "textarea" },
        backgroundImage: { type: "text" },
        backgroundVideo: { type: "text" },
        ctaText: { type: "text" },
        ctaLink: { type: "text" },
        overlay: { type: "checkbox" },
        overlayOpacity: { type: "number", min: 0, max: 100 },
        alignment: alignmentField,
      },
      render: HeroBlock,
    },
    SpacerBlock: {
      fields: {
        height: { type: "number", min: 16, max: 500 },
      },
      render: SpacerBlock,
    },
    DividerBlock: {
      fields: {
        style: {
          type: "select" as const,
          options: [
            { label: "Solid", value: "solid" },
            { label: "Dashed", value: "dashed" },
            { label: "Dotted", value: "dotted" },
          ],
        },
        width: {
          type: "select" as const,
          options: [
            { label: "Full", value: "full" },
            { label: "Half", value: "half" },
            { label: "Third", value: "third" },
          ],
        },
      },
      render: DividerBlock,
    },
    // Content Blocks
    TextBlock: {
      fields: {
        html: { type: "textarea" },
        alignment: alignmentField,
      },
      render: TextBlock,
    },
    HeadingBlock: {
      fields: {
        text: { type: "text" },
        level: {
          type: "select" as const,
          options: [
            { label: "Heading 1", value: "h1" },
            { label: "Heading 2", value: "h2" },
            { label: "Heading 3", value: "h3" },
            { label: "Heading 4", value: "h4" },
            { label: "Heading 5", value: "h5" },
            { label: "Heading 6", value: "h6" },
          ],
        },
        alignment: alignmentField,
      },
      render: HeadingBlock,
    },
    ImageBlock: {
      fields: {
        url: { type: "text" },
        alt: { type: "text" },
        caption: { type: "text" },
        link: { type: "text" },
        size: sizeField,
      },
      render: ImageBlock,
    },
    GalleryBlock: {
      fields: {
        images: {
          type: "array",
          arrayFields: {
            url: { type: "text" },
            alt: { type: "text" },
            caption: { type: "text" },
          },
        },
        layout: {
          type: "select" as const,
          options: [
            { label: "Grid", value: "grid" },
            { label: "Masonry", value: "masonry" },
            { label: "Slider", value: "slider" },
          ],
        },
        columns: { type: "number", min: 2, max: 6 },
      },
      render: GalleryBlock,
    },
    VideoBlock: {
      fields: {
        url: { type: "text" },
        autoplay: { type: "checkbox" },
        muted: { type: "checkbox" },
        loop: { type: "checkbox" },
      },
      render: VideoBlock,
    },
    CTABlock: {
      fields: {
        text: { type: "text" },
        link: { type: "text" },
        style: {
          type: "select" as const,
          options: [
            { label: "Primary", value: "primary" },
            { label: "Secondary", value: "secondary" },
            { label: "Outline", value: "outline" },
            { label: "Ghost", value: "ghost" },
          ],
        },
        size: {
          type: "select" as const,
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        alignment: alignmentField,
      },
      render: CTABlock,
    },
    // Artist Blocks
    ArtistBioBlock: {
      fields: {
        name: { type: "text" },
        genres: { type: "text" },
        bio: { type: "textarea" },
        image: { type: "text" },
      },
      render: ArtistBioBlock,
    },
    MusicLinksBlock: {
      fields: {
        platforms: {
          type: "array",
          arrayFields: {
            name: { type: "text" },
            url: { type: "text" },
          },
        },
        style: {
          type: "select" as const,
          options: [
            { label: "Icons", value: "icons" },
            { label: "Buttons", value: "buttons" },
            { label: "List", value: "list" },
          ],
        },
      },
      render: MusicLinksBlock,
    },
    SocialLinksBlock: {
      fields: {
        platforms: {
          type: "array",
          arrayFields: {
            name: { type: "text" },
            url: { type: "text" },
          },
        },
        style: {
          type: "select" as const,
          options: [
            { label: "Icons", value: "icons" },
            { label: "Buttons", value: "buttons" },
          ],
        },
      },
      render: SocialLinksBlock,
    },
    TourDatesBlock: {
      fields: {
        limit: { type: "number", min: 1, max: 20 },
        showPast: { type: "checkbox" },
      },
      render: TourDatesBlock,
    },
    MusicPlayerBlock: {
      fields: {
        platform: {
          type: "select" as const,
          options: [
            { label: "Spotify", value: "spotify" },
            { label: "SoundCloud", value: "soundcloud" },
            { label: "Apple Music", value: "apple" },
            { label: "YouTube", value: "youtube" },
          ],
        },
        embedId: { type: "text" },
        type: {
          type: "select" as const,
          options: [
            { label: "Track", value: "track" },
            { label: "Album", value: "album" },
            { label: "Playlist", value: "playlist" },
          ],
        },
      },
      render: MusicPlayerBlock,
    },
    // Event Blocks
    EventsListBlock: {
      fields: {
        filter: {
          type: "select" as const,
          options: [
            { label: "Upcoming", value: "upcoming" },
            { label: "Past", value: "past" },
            { label: "All", value: "all" },
          ],
        },
        limit: { type: "number", min: 1, max: 20 },
        layout: {
          type: "select" as const,
          options: [
            { label: "List", value: "list" },
            { label: "Grid", value: "grid" },
            { label: "Cards", value: "cards" },
          ],
        },
      },
      render: EventsListBlock,
    },
    EventCardBlock: {
      fields: {
        eventId: { type: "text" },
        style: {
          type: "select" as const,
          options: [
            { label: "Full", value: "full" },
            { label: "Compact", value: "compact" },
            { label: "Minimal", value: "minimal" },
          ],
        },
      },
      render: EventCardBlock,
    },
    CountdownBlock: {
      fields: {
        targetDate: { type: "text" },
        title: { type: "text" },
      },
      render: CountdownBlock,
    },
    // Product Blocks
    ProductsGridBlock: {
      fields: {
        categoryId: { type: "text" },
        limit: { type: "number", min: 1, max: 24 },
        columns: { type: "number", min: 2, max: 6 },
      },
      render: ProductsGridBlock,
    },
    ProductCardBlock: {
      fields: {
        productId: { type: "text" },
        style: {
          type: "select" as const,
          options: [
            { label: "Full", value: "full" },
            { label: "Compact", value: "compact" },
            { label: "Minimal", value: "minimal" },
          ],
        },
      },
      render: ProductCardBlock,
    },
    FeaturedProductsBlock: {
      fields: {
        productIds: { type: "text" },
        layout: {
          type: "select" as const,
          options: [
            { label: "Grid", value: "grid" },
            { label: "Slider", value: "slider" },
            { label: "List", value: "list" },
          ],
        },
      },
      render: FeaturedProductsBlock,
    },
    // Utility Blocks
    ContactFormBlock: {
      fields: {
        fields: {
          type: "array",
          arrayFields: {
            name: { type: "text" },
            type: {
              type: "select" as const,
              options: [
                { label: "Text", value: "text" },
                { label: "Email", value: "email" },
                { label: "Textarea", value: "textarea" },
                { label: "Select", value: "select" },
              ],
            },
            required: { type: "checkbox" },
            placeholder: { type: "text" },
          },
        },
        submitText: { type: "text" },
      },
      render: ContactFormBlock,
    },
    NewsletterBlock: {
      fields: {
        title: { type: "text" },
        description: { type: "textarea" },
      },
      render: NewsletterBlock,
    },
    MapBlock: {
      fields: {
        address: { type: "text" },
        zoom: { type: "number", min: 1, max: 20 },
      },
      render: MapBlock,
    },
    FAQBlock: {
      fields: {
        items: {
          type: "array",
          arrayFields: {
            question: { type: "text" },
            answer: { type: "textarea" },
          },
        },
      },
      render: FAQBlock,
    },
    TestimonialsBlock: {
      fields: {
        items: {
          type: "array",
          arrayFields: {
            quote: { type: "textarea" },
            author: { type: "text" },
            role: { type: "text" },
          },
        },
        layout: {
          type: "select" as const,
          options: [
            { label: "Grid", value: "grid" },
            { label: "Slider", value: "slider" },
            { label: "List", value: "list" },
          ],
        },
      },
      render: TestimonialsBlock,
    },
    HTMLBlock: {
      fields: {
        code: { type: "textarea" },
      },
      render: HTMLBlock,
    },
  },
}

export default puckConfig