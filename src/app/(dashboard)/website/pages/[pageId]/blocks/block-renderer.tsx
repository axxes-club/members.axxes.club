"use client"

import { cn } from "@/lib/utils"
import type {
  PageBlock,
  BlockContent,
  BlockSettings,
  HeroBlockContent,
  TextBlockContent,
  HeadingBlockContent,
  ImageBlockContent,
  GalleryBlockContent,
  VideoBlockContent,
  SpacerBlockContent,
  DividerBlockContent,
  CTABlockContent,
  ArtistBioBlockContent,
  MusicLinksBlockContent,
  SocialLinksBlockContent,
  TourDatesBlockContent,
  MusicPlayerBlockContent,
  EventsListBlockContent,
  EventCardBlockContent,
  CountdownBlockContent,
  ProductsGridBlockContent,
  ProductCardBlockContent,
  FeaturedProductsBlockContent,
  ContactFormBlockContent,
  NewsletterBlockContent,
  MapBlockContent,
  FAQBlockContent,
  TestimonialsBlockContent,
  HTMLBlockContent,
} from "@/lib/db/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Music,
  Play,
  ExternalLink,
  MapPin,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Linkedin,
  Globe,
  Mail,
  Phone,
  ShoppingBag,
  Star,
  Quote,
} from "lucide-react"

interface BlockRendererProps {
  block: PageBlock
  isEditing?: boolean
}

// Generate CSS from block settings and overrides
function generateBlockStyles(settings?: BlockSettings): React.CSSProperties {
  if (!settings) return {}

  const styles: React.CSSProperties = {}

  // Legacy settings
  if (settings.backgroundColor) styles.backgroundColor = settings.backgroundColor
  if (settings.textColor) styles.color = settings.textColor
  if (settings.backgroundImage) {
    styles.backgroundImage = `url(${settings.backgroundImage})`
    styles.backgroundSize = "cover"
    styles.backgroundPosition = "center"
  }

  // Padding
  if (settings.padding) {
    if (settings.padding.top) styles.paddingTop = settings.padding.top
    if (settings.padding.bottom) styles.paddingBottom = settings.padding.bottom
    if (settings.padding.left) styles.paddingLeft = settings.padding.left
    if (settings.padding.right) styles.paddingRight = settings.padding.right
  }

  // Margin
  if (settings.margin) {
    if (settings.margin.top) styles.marginTop = settings.margin.top
    if (settings.margin.bottom) styles.marginBottom = settings.margin.bottom
  }

  // Apply overrides
  const overrides = settings.overrides
  if (overrides) {
    // Typography
    if (overrides.typography) {
      if (overrides.typography.fontFamily) styles.fontFamily = overrides.typography.fontFamily
      if (overrides.typography.fontSize) styles.fontSize = overrides.typography.fontSize
      if (overrides.typography.fontWeight) styles.fontWeight = overrides.typography.fontWeight
      if (overrides.typography.lineHeight) styles.lineHeight = overrides.typography.lineHeight
      if (overrides.typography.letterSpacing) styles.letterSpacing = overrides.typography.letterSpacing
      if (overrides.typography.textTransform) styles.textTransform = overrides.typography.textTransform
      if (overrides.typography.textDecoration) styles.textDecoration = overrides.typography.textDecoration
      if (overrides.typography.fontStyle) styles.fontStyle = overrides.typography.fontStyle
    }

    // Colors
    if (overrides.colors) {
      if (overrides.colors.text) styles.color = overrides.colors.text
      if (overrides.colors.background) styles.backgroundColor = overrides.colors.background
    }

    // Spacing overrides
    if (overrides.spacing) {
      if (overrides.spacing.padding) {
        const p = overrides.spacing.padding
        if (p.top) styles.paddingTop = typeof p.top === "number" ? `${p.top}px` : p.top
        if (p.right) styles.paddingRight = typeof p.right === "number" ? `${p.right}px` : p.right
        if (p.bottom) styles.paddingBottom = typeof p.bottom === "number" ? `${p.bottom}px` : p.bottom
        if (p.left) styles.paddingLeft = typeof p.left === "number" ? `${p.left}px` : p.left
      }
      if (overrides.spacing.margin) {
        const m = overrides.spacing.margin
        if (m.top) styles.marginTop = typeof m.top === "number" ? `${m.top}px` : m.top
        if (m.right) styles.marginRight = typeof m.right === "number" ? `${m.right}px` : m.right
        if (m.bottom) styles.marginBottom = typeof m.bottom === "number" ? `${m.bottom}px` : m.bottom
        if (m.left) styles.marginLeft = typeof m.left === "number" ? `${m.left}px` : m.left
      }
      if (overrides.spacing.gap) {
        styles.gap = typeof overrides.spacing.gap === "number" ? `${overrides.spacing.gap}px` : overrides.spacing.gap
      }
    }

    // Background
    if (overrides.background) {
      if (overrides.background.color) styles.backgroundColor = overrides.background.color
      if (overrides.background.gradient) styles.background = overrides.background.gradient
      if (overrides.background.image) {
        styles.backgroundImage = `url(${overrides.background.image})`
        if (overrides.background.imagePosition) styles.backgroundPosition = overrides.background.imagePosition
        if (overrides.background.imageSize) styles.backgroundSize = overrides.background.imageSize
        if (overrides.background.imageRepeat) styles.backgroundRepeat = overrides.background.imageRepeat
        if (overrides.background.imageAttachment) styles.backgroundAttachment = overrides.background.imageAttachment
      }
    }

    // Border
    if (overrides.border) {
      if (overrides.border.width) styles.borderWidth = overrides.border.width
      if (overrides.border.style) styles.borderStyle = overrides.border.style
      if (overrides.border.color) styles.borderColor = overrides.border.color
      if (overrides.border.radius) styles.borderRadius = overrides.border.radius
    }

    // Shadow
    if (overrides.shadow) {
      if (overrides.shadow.custom) {
        styles.boxShadow = overrides.shadow.custom
      } else if (overrides.shadow.preset) {
        const shadows: Record<string, string> = {
          none: "none",
          sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
          md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
          lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
          xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
          "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
          inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
        }
        styles.boxShadow = shadows[overrides.shadow.preset] || "none"
      }
    }

    // Size
    if (overrides.size) {
      if (overrides.size.width) styles.width = overrides.size.width
      if (overrides.size.minWidth) styles.minWidth = overrides.size.minWidth
      if (overrides.size.maxWidth) styles.maxWidth = overrides.size.maxWidth
      if (overrides.size.height) styles.height = overrides.size.height
      if (overrides.size.minHeight) styles.minHeight = overrides.size.minHeight
      if (overrides.size.maxHeight) styles.maxHeight = overrides.size.maxHeight
      if (overrides.size.aspectRatio) styles.aspectRatio = overrides.size.aspectRatio
    }

    // Layout
    if (overrides.layout) {
      if (overrides.layout.display) styles.display = overrides.layout.display
      if (overrides.layout.flexDirection) styles.flexDirection = overrides.layout.flexDirection
      if (overrides.layout.position) styles.position = overrides.layout.position
      if (overrides.layout.zIndex) styles.zIndex = overrides.layout.zIndex
      if (overrides.layout.overflow) styles.overflow = overrides.layout.overflow

      // Map justify/align to CSS
      const justifyMap: Record<string, string> = {
        start: "flex-start",
        center: "center",
        end: "flex-end",
        between: "space-between",
        around: "space-around",
        evenly: "space-evenly",
      }
      const alignMap: Record<string, string> = {
        start: "flex-start",
        center: "center",
        end: "flex-end",
        stretch: "stretch",
        baseline: "baseline",
      }
      if (overrides.layout.justifyContent) {
        styles.justifyContent = justifyMap[overrides.layout.justifyContent] || overrides.layout.justifyContent
      }
      if (overrides.layout.alignItems) {
        styles.alignItems = alignMap[overrides.layout.alignItems] || overrides.layout.alignItems
      }
    }
  }

  return styles
}

// Get max-width class from settings
function getMaxWidthClass(maxWidth?: string): string {
  const widths: Record<string, string> = {
    sm: "max-w-2xl",
    md: "max-w-4xl",
    lg: "max-w-5xl",
    xl: "max-w-6xl",
    full: "max-w-full",
  }
  return widths[maxWidth || "full"] || "max-w-full"
}

export function BlockRenderer({ block, isEditing = false }: BlockRendererProps) {
  const content = block.content as BlockContent
  const settings = block.settings as BlockSettings | undefined
  const blockStyles = generateBlockStyles(settings)
  const maxWidthClass = getMaxWidthClass(settings?.maxWidth)

  // Wrapper with custom CSS support
  const wrapperClasses = cn(
    maxWidthClass,
    "mx-auto",
    settings?.customClasses,
    settings?.hideOnMobile && "hidden md:block",
    settings?.hideOnDesktop && "md:hidden"
  )

  const renderBlock = () => {
    switch (block.type) {
      case "hero":
        return <HeroBlock content={content as HeroBlockContent} isEditing={isEditing} />
      case "text":
        return <TextBlock content={content as TextBlockContent} isEditing={isEditing} />
      case "heading":
        return <HeadingBlock content={content as HeadingBlockContent} isEditing={isEditing} />
      case "image":
        return <ImageBlock content={content as ImageBlockContent} isEditing={isEditing} />
      case "gallery":
        return <GalleryBlock content={content as GalleryBlockContent} isEditing={isEditing} />
      case "video":
        return <VideoBlock content={content as VideoBlockContent} isEditing={isEditing} />
      case "spacer":
        return <SpacerBlock content={content as SpacerBlockContent} isEditing={isEditing} />
      case "divider":
        return <DividerBlock content={content as DividerBlockContent} isEditing={isEditing} />
      case "cta":
        return <CTABlock content={content as CTABlockContent} isEditing={isEditing} />
      case "artist-bio":
        return <ArtistBioBlock content={content as ArtistBioBlockContent} isEditing={isEditing} />
      case "music-links":
        return <MusicLinksBlock content={content as MusicLinksBlockContent} isEditing={isEditing} />
      case "social-links":
        return <SocialLinksBlock content={content as SocialLinksBlockContent} isEditing={isEditing} />
      case "tour-dates":
        return <TourDatesBlock content={content as TourDatesBlockContent} isEditing={isEditing} />
      case "music-player":
        return <MusicPlayerBlock content={content as MusicPlayerBlockContent} isEditing={isEditing} />
      case "events-list":
        return <EventsListBlock content={content as EventsListBlockContent} isEditing={isEditing} />
      case "event-card":
        return <EventCardBlock content={content as EventCardBlockContent} isEditing={isEditing} />
      case "countdown":
        return <CountdownBlock content={content as CountdownBlockContent} isEditing={isEditing} />
      case "products-grid":
        return <ProductsGridBlock content={content as ProductsGridBlockContent} isEditing={isEditing} />
      case "product-card":
        return <ProductCardBlock content={content as ProductCardBlockContent} isEditing={isEditing} />
      case "featured-products":
        return <FeaturedProductsBlock content={content as FeaturedProductsBlockContent} isEditing={isEditing} />
      case "contact-form":
        return <ContactFormBlock content={content as ContactFormBlockContent} isEditing={isEditing} />
      case "newsletter":
        return <NewsletterBlock content={content as NewsletterBlockContent} isEditing={isEditing} />
      case "map":
        return <MapBlock content={content as MapBlockContent} isEditing={isEditing} />
      case "faq":
        return <FAQBlock content={content as FAQBlockContent} isEditing={isEditing} />
      case "testimonials":
        return <TestimonialsBlock content={content as TestimonialsBlockContent} isEditing={isEditing} />
      case "html":
        return <HTMLBlock content={content as HTMLBlockContent} isEditing={isEditing} />
      default:
        return <PlaceholderBlock type={block.type} isEditing={isEditing} />
    }
  }

  return (
    <div
      className={wrapperClasses}
      style={blockStyles}
      role={settings?.role}
      aria-label={settings?.ariaLabel}
    >
      {/* Custom CSS injection */}
      {settings?.customCSS && (
        <style dangerouslySetInnerHTML={{ __html: settings.customCSS }} />
      )}
      {renderBlock()}
    </div>
  )
}

// ============================================
// CORE BLOCKS
// ============================================

// Hero Block
function HeroBlock({ content, isEditing }: { content: HeroBlockContent; isEditing: boolean }) {
  return (
    <div
      className={cn(
        "relative flex min-h-[400px] flex-col items-center justify-center p-8 text-center",
        content.backgroundImage && "bg-cover bg-center",
        content.backgroundVideo && "overflow-hidden",
        !content.backgroundImage && !content.backgroundVideo && "bg-gradient-to-br from-primary/10 to-primary/5"
      )}
      style={content.backgroundImage ? { backgroundImage: `url(${content.backgroundImage})` } : undefined}
    >
      {/* Background Video */}
      {content.backgroundVideo && !isEditing && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={content.backgroundVideo}
          autoPlay
          muted
          loop
          playsInline
        />
      )}
      {content.backgroundVideo && isEditing && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Play className="h-12 w-12 text-muted-foreground" />
        </div>
      )}

      {/* Overlay */}
      {content.overlay && (content.backgroundImage || content.backgroundVideo) && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: (content.overlayOpacity ?? 50) / 100 }}
        />
      )}

      {/* Content */}
      <div className={cn(
        "relative z-10 max-w-4xl",
        content.alignment === "left" && "text-left self-start",
        content.alignment === "right" && "text-right self-end"
      )}>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
          {content.title || "Hero Title"}
        </h1>
        {content.subtitle && (
          <p className="mt-4 text-lg text-muted-foreground md:text-xl">
            {content.subtitle}
          </p>
        )}
        {content.ctaText && (
          <Button className="mt-6" size="lg" asChild={!isEditing}>
            {isEditing ? (
              content.ctaText
            ) : (
              <a href={content.ctaLink || "#"}>{content.ctaText}</a>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

// Text Block
function TextBlock({ content, isEditing }: { content: TextBlockContent; isEditing: boolean }) {
  return (
    <div
      className={cn(
        "prose prose-sm md:prose-base dark:prose-invert max-w-none p-6",
        content.alignment === "center" && "text-center",
        content.alignment === "right" && "text-right"
      )}
      dangerouslySetInnerHTML={{ __html: content.html || "<p>Enter your text here...</p>" }}
    />
  )
}

// Heading Block
function HeadingBlock({ content, isEditing }: { content: HeadingBlockContent; isEditing: boolean }) {
  const Tag = content.level || "h2"
  const sizes: Record<string, string> = {
    h1: "text-4xl font-bold",
    h2: "text-3xl font-bold",
    h3: "text-2xl font-semibold",
    h4: "text-xl font-semibold",
    h5: "text-lg font-medium",
    h6: "text-base font-medium",
  }

  return (
    <div className={cn("p-6", content.alignment === "center" && "text-center", content.alignment === "right" && "text-right")}>
      <Tag className={sizes[Tag]}>
        {content.text || "Section Title"}
      </Tag>
    </div>
  )
}

// Image Block
function ImageBlock({ content, isEditing }: { content: ImageBlockContent; isEditing: boolean }) {
  const sizes: Record<string, string> = {
    small: "max-w-sm",
    medium: "max-w-lg",
    large: "max-w-2xl",
    full: "max-w-full",
  }

  if (!content.url) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className={cn("aspect-video w-full rounded-lg bg-muted flex items-center justify-center", sizes[content.size || "large"])}>
          <p className="text-muted-foreground">Click to add an image</p>
        </div>
      </div>
    )
  }

  const imageContent = (
    <figure className="p-6">
      <img
        src={content.url}
        alt={content.alt || ""}
        className={cn("mx-auto rounded-lg", sizes[content.size || "large"])}
      />
      {content.caption && (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">
          {content.caption}
        </figcaption>
      )}
    </figure>
  )

  if (content.link && !isEditing) {
    return <a href={content.link}>{imageContent}</a>
  }

  return imageContent
}

// Gallery Block
function GalleryBlock({ content, isEditing }: { content: GalleryBlockContent; isEditing: boolean }) {
  const images = content.images || []
  const columns = content.columns || 3
  const layout = content.layout || "grid"

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 border-y border-dashed bg-muted/30">
        <p className="text-muted-foreground">Add images to create a gallery</p>
      </div>
    )
  }

  if (layout === "slider") {
    return (
      <div className="relative p-6">
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
          {images.map((img, idx) => (
            <div key={idx} className="flex-none w-80 snap-center">
              <img src={img.url} alt={img.alt || ""} className="rounded-lg w-full aspect-video object-cover" />
              {img.caption && <p className="mt-2 text-sm text-muted-foreground">{img.caption}</p>}
            </div>
          ))}
        </div>
        <Button variant="outline" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div
        className={cn(
          "grid gap-4",
          layout === "masonry" && "columns-2 md:columns-3 space-y-4",
          layout === "grid" && `grid-cols-2 md:grid-cols-${columns}`
        )}
        style={layout === "grid" ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined}
      >
        {images.map((img, idx) => (
          <div key={idx} className={cn(layout === "masonry" && "break-inside-avoid")}>
            <img src={img.url} alt={img.alt || ""} className="rounded-lg w-full object-cover" />
            {img.caption && <p className="mt-2 text-sm text-muted-foreground">{img.caption}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

// Video Block
function VideoBlock({ content, isEditing }: { content: VideoBlockContent; isEditing: boolean }) {
  if (!content.url) {
    return (
      <div className="flex items-center justify-center p-8 border-y border-dashed bg-muted/30">
        <div className="text-center">
          <Play className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Add a video URL</p>
        </div>
      </div>
    )
  }

  // Check if it's a YouTube or Vimeo URL
  const isYouTube = content.url.includes("youtube.com") || content.url.includes("youtu.be")
  const isVimeo = content.url.includes("vimeo.com")

  if (isYouTube || isVimeo) {
    let embedUrl = content.url
    if (isYouTube) {
      const videoId = content.url.includes("youtu.be")
        ? content.url.split("/").pop()
        : new URLSearchParams(new URL(content.url).search).get("v")
      embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=${content.autoplay ? 1 : 0}&mute=${content.muted ? 1 : 0}&loop=${content.loop ? 1 : 0}`
    } else if (isVimeo) {
      const videoId = content.url.split("/").pop()
      embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=${content.autoplay ? 1 : 0}&muted=${content.muted ? 1 : 0}&loop=${content.loop ? 1 : 0}`
    }

    return (
      <div className="p-6">
        <div className="aspect-video w-full overflow-hidden rounded-lg">
          <iframe
            src={embedUrl}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <video
        src={content.url}
        className="w-full rounded-lg"
        controls
        autoPlay={content.autoplay && !isEditing}
        muted={content.muted}
        loop={content.loop}
      />
    </div>
  )
}

// Spacer Block
function SpacerBlock({ content, isEditing }: { content: SpacerBlockContent; isEditing: boolean }) {
  return (
    <div
      className={cn(isEditing && "bg-muted/30 border-y border-dashed")}
      style={{ height: content.height || 64 }}
    >
      {isEditing && (
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          {content.height || 64}px
        </div>
      )}
    </div>
  )
}

// Divider Block
function DividerBlock({ content, isEditing }: { content: DividerBlockContent; isEditing: boolean }) {
  const widths: Record<string, string> = {
    full: "w-full",
    half: "w-1/2",
    third: "w-1/3",
  }

  return (
    <div className="flex justify-center py-6">
      <hr
        className={cn(
          "border-t",
          widths[content.width || "full"],
          content.style === "dashed" && "border-dashed",
          content.style === "dotted" && "border-dotted"
        )}
      />
    </div>
  )
}

// CTA Block
function CTABlock({ content, isEditing }: { content: CTABlockContent; isEditing: boolean }) {
  const variants: Record<string, "default" | "secondary" | "outline" | "ghost"> = {
    primary: "default",
    secondary: "secondary",
    outline: "outline",
    ghost: "ghost",
  }

  const sizes: Record<string, "default" | "sm" | "lg"> = {
    sm: "sm",
    md: "default",
    lg: "lg",
  }

  return (
    <div
      className={cn(
        "p-6",
        content.alignment === "center" && "text-center",
        content.alignment === "right" && "text-right",
        content.alignment === "left" && "text-left"
      )}
    >
      <Button
        variant={variants[content.style || "primary"]}
        size={sizes[content.size || "md"]}
        asChild={!isEditing}
      >
        {isEditing ? (
          content.text || "Button"
        ) : (
          <a href={content.link || "#"}>{content.text || "Button"}</a>
        )}
      </Button>
    </div>
  )
}

// ============================================
// ARTIST/TALENT BLOCKS
// ============================================

// Artist Bio Block
function ArtistBioBlock({ content, isEditing }: { content: ArtistBioBlockContent; isEditing: boolean }) {
  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {content.image ? (
          <img
            src={content.image}
            alt={content.name || "Artist"}
            className="w-48 h-48 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-48 h-48 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <Music className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1">
          <h2 className="text-3xl font-bold">{content.name || "Artist Name"}</h2>
          {content.genres && content.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {content.genres.map((genre, idx) => (
                <Badge key={idx} variant="secondary">{genre}</Badge>
              ))}
            </div>
          )}
          {content.bio && (
            <p className="mt-4 text-muted-foreground leading-relaxed">{content.bio}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Music Links Block
function MusicLinksBlock({ content, isEditing }: { content: MusicLinksBlockContent; isEditing: boolean }) {
  const platforms = content.platforms || []
  const style = content.style || "buttons"

  const getPlatformIcon = (name: string) => {
    const icons: Record<string, React.ReactNode> = {
      spotify: <Music className="h-5 w-5" />,
      apple: <Music className="h-5 w-5" />,
      soundcloud: <Music className="h-5 w-5" />,
      youtube: <Youtube className="h-5 w-5" />,
      bandcamp: <Music className="h-5 w-5" />,
    }
    return icons[name.toLowerCase()] || <ExternalLink className="h-5 w-5" />
  }

  if (platforms.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 border-y border-dashed bg-muted/30">
        <p className="text-muted-foreground">Add music platform links</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className={cn(
        "flex flex-wrap justify-center",
        style === "icons" && "gap-4",
        style === "buttons" && "gap-3",
        style === "list" && "flex-col gap-2 max-w-sm mx-auto"
      )}>
        {platforms.map((platform, idx) => (
          style === "icons" ? (
            <a
              key={idx}
              href={isEditing ? "#" : platform.url}
              className="p-3 rounded-full bg-muted hover:bg-muted/80 transition-colors"
              title={platform.name}
            >
              {getPlatformIcon(platform.name)}
            </a>
          ) : style === "buttons" ? (
            <Button key={idx} variant="outline" asChild={!isEditing}>
              {isEditing ? (
                <>
                  {getPlatformIcon(platform.name)}
                  <span className="ml-2">{platform.name}</span>
                </>
              ) : (
                <a href={platform.url} className="flex items-center gap-2">
                  {getPlatformIcon(platform.name)}
                  {platform.name}
                </a>
              )}
            </Button>
          ) : (
            <a
              key={idx}
              href={isEditing ? "#" : platform.url}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              {getPlatformIcon(platform.name)}
              <span>{platform.name}</span>
              <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
            </a>
          )
        ))}
      </div>
    </div>
  )
}

// Social Links Block
function SocialLinksBlock({ content, isEditing }: { content: SocialLinksBlockContent; isEditing: boolean }) {
  const platforms = content.platforms || []
  const style = content.style || "icons"

  const getSocialIcon = (name: string) => {
    const icons: Record<string, React.ReactNode> = {
      instagram: <Instagram className="h-5 w-5" />,
      twitter: <Twitter className="h-5 w-5" />,
      facebook: <Facebook className="h-5 w-5" />,
      youtube: <Youtube className="h-5 w-5" />,
      linkedin: <Linkedin className="h-5 w-5" />,
      tiktok: <Music className="h-5 w-5" />,
      website: <Globe className="h-5 w-5" />,
    }
    return icons[name.toLowerCase()] || <ExternalLink className="h-5 w-5" />
  }

  if (platforms.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 border-y border-dashed bg-muted/30">
        <p className="text-muted-foreground">Add social media links</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className={cn(
        "flex flex-wrap justify-center",
        style === "icons" ? "gap-4" : "gap-3"
      )}>
        {platforms.map((platform, idx) => (
          style === "icons" ? (
            <a
              key={idx}
              href={isEditing ? "#" : platform.url}
              className="p-3 rounded-full bg-muted hover:bg-muted/80 transition-colors"
              title={platform.name}
            >
              {getSocialIcon(platform.name)}
            </a>
          ) : (
            <Button key={idx} variant="outline" asChild={!isEditing}>
              {isEditing ? (
                <>
                  {getSocialIcon(platform.name)}
                  <span className="ml-2">{platform.name}</span>
                </>
              ) : (
                <a href={platform.url} className="flex items-center gap-2">
                  {getSocialIcon(platform.name)}
                  {platform.name}
                </a>
              )}
            </Button>
          )
        ))}
      </div>
    </div>
  )
}

// Tour Dates Block
function TourDatesBlock({ content, isEditing }: { content: TourDatesBlockContent; isEditing: boolean }) {
  // This would typically fetch events from the database
  // For now, show placeholder
  const limit = content.limit || 5

  return (
    <div className="p-6">
      <div className="space-y-4">
        {Array.from({ length: Math.min(limit, 3) }).map((_, idx) => (
          <Card key={idx} className="overflow-hidden">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-lg flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-primary">{15 + idx}</span>
                <span className="text-xs text-muted-foreground">MAR</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold truncate">Sample Venue {idx + 1}</h4>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  City, Country
                </p>
              </div>
              <Button size="sm" variant="outline">Tickets</Button>
            </CardContent>
          </Card>
        ))}
        {isEditing && (
          <p className="text-center text-sm text-muted-foreground">
            Events will be loaded from your event database
          </p>
        )}
      </div>
    </div>
  )
}

// Music Player Block
function MusicPlayerBlock({ content, isEditing }: { content: MusicPlayerBlockContent; isEditing: boolean }) {
  if (!content.embedId) {
    return (
      <div className="flex items-center justify-center p-8 border-y border-dashed bg-muted/30">
        <div className="text-center">
          <Play className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Add a music embed ID</p>
        </div>
      </div>
    )
  }

  const platform = content.platform || "spotify"
  const type = content.type || "track"

  let embedUrl = ""
  switch (platform) {
    case "spotify":
      embedUrl = `https://open.spotify.com/embed/${type}/${content.embedId}`
      break
    case "soundcloud":
      embedUrl = `https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/${content.embedId}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`
      break
    case "apple":
      embedUrl = `https://embed.music.apple.com/us/${type}/${content.embedId}`
      break
    case "youtube":
      embedUrl = `https://www.youtube.com/embed/${content.embedId}`
      break
  }

  return (
    <div className="p-6">
      <div className={cn(
        "w-full overflow-hidden rounded-lg",
        platform === "spotify" && type === "track" && "h-20",
        platform === "spotify" && type !== "track" && "h-96",
        platform !== "spotify" && "aspect-video"
      )}>
        <iframe
          src={embedUrl}
          className="h-full w-full"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      </div>
    </div>
  )
}

// ============================================
// EVENT BLOCKS
// ============================================

// Events List Block
function EventsListBlock({ content, isEditing }: { content: EventsListBlockContent; isEditing: boolean }) {
  const layout = content.layout || "list"
  const limit = content.limit || 6

  // Placeholder events - would be fetched from database
  const events = Array.from({ length: Math.min(limit, 4) }).map((_, idx) => ({
    id: idx,
    title: `Event ${idx + 1}`,
    date: new Date(Date.now() + idx * 7 * 24 * 60 * 60 * 1000),
    venue: `Venue ${idx + 1}`,
    location: "City, Country",
  }))

  if (layout === "cards") {
    return (
      <div className="p-6">
        <div className="grid gap-6 md:grid-cols-2">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden">
              <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5" />
              <CardHeader>
                <CardTitle>{event.title}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {event.date.toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button className="w-full">Get Tickets</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        {isEditing && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Events will be loaded from your event database
          </p>
        )}
      </div>
    )
  }

  if (layout === "grid") {
    return (
      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div key={event.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <p className="text-sm text-primary font-medium">{event.date.toLocaleDateString()}</p>
              <h4 className="font-semibold mt-1">{event.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">{event.venue}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // List layout
  return (
    <div className="p-6">
      <div className="divide-y">
        {events.map((event) => (
          <div key={event.id} className="py-4 flex items-center gap-4">
            <div className="flex-shrink-0 w-16 text-center">
              <p className="text-2xl font-bold text-primary">{event.date.getDate()}</p>
              <p className="text-xs text-muted-foreground uppercase">
                {event.date.toLocaleDateString("en-US", { month: "short" })}
              </p>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate">{event.title}</h4>
              <p className="text-sm text-muted-foreground">{event.venue} • {event.location}</p>
            </div>
            <Button size="sm">Tickets</Button>
          </div>
        ))}
      </div>
    </div>
  )
}

// Event Card Block
function EventCardBlock({ content, isEditing }: { content: EventCardBlockContent; isEditing: boolean }) {
  const style = content.style || "full"

  // Placeholder - would fetch specific event from database
  const event = {
    title: "Sample Event",
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    venue: "Sample Venue",
    location: "City, Country",
    description: "Event description goes here...",
    image: null,
  }

  if (style === "minimal") {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 p-4 border rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{event.date.getDate()}</p>
            <p className="text-xs text-muted-foreground uppercase">
              {event.date.toLocaleDateString("en-US", { month: "short" })}
            </p>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold">{event.title}</h4>
            <p className="text-sm text-muted-foreground">{event.venue}</p>
          </div>
          <Button size="sm">Tickets</Button>
        </div>
      </div>
    )
  }

  if (style === "compact") {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-4 flex gap-4">
            <div className="w-20 h-20 bg-primary/10 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-primary">{event.date.getDate()}</span>
              <span className="text-xs text-muted-foreground uppercase">
                {event.date.toLocaleDateString("en-US", { month: "short" })}
              </span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">{event.title}</h4>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" /> {event.venue}
              </p>
              <Button size="sm" className="mt-2">Get Tickets</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Full style
  return (
    <div className="p-6">
      <Card className="overflow-hidden">
        <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Calendar className="h-16 w-16 text-primary/40" />
        </div>
        <CardHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {event.date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
          <CardTitle className="text-2xl">{event.title}</CardTitle>
          <CardDescription className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {event.venue} • {event.location}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{event.description}</p>
        </CardContent>
        <CardFooter>
          <Button className="w-full" size="lg">Get Tickets</Button>
        </CardFooter>
      </Card>
      {isEditing && !content.eventId && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          Select an event to display
        </p>
      )}
    </div>
  )
}

// Countdown Block
function CountdownBlock({ content, isEditing }: { content: CountdownBlockContent; isEditing: boolean }) {
  const targetDate = content.targetDate ? new Date(content.targetDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const now = new Date()
  const diff = targetDate.getTime() - now.getTime()

  const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
  const hours = Math.max(0, Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)))
  const minutes = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)))
  const seconds = Math.max(0, Math.floor((diff % (1000 * 60)) / 1000))

  return (
    <div className="p-8 text-center">
      {content.title && <h3 className="text-2xl font-bold mb-6">{content.title}</h3>}
      <div className="flex justify-center gap-4 md:gap-8">
        {[
          { value: days, label: "Days" },
          { value: hours, label: "Hours" },
          { value: minutes, label: "Minutes" },
          { value: seconds, label: "Seconds" },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <div className="w-16 h-16 md:w-24 md:h-24 bg-primary/10 rounded-lg flex items-center justify-center">
              <span className="text-2xl md:text-4xl font-bold text-primary">
                {String(item.value).padStart(2, "0")}
              </span>
            </div>
            <p className="mt-2 text-xs md:text-sm text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// PRODUCT BLOCKS
// ============================================

// Products Grid Block
function ProductsGridBlock({ content, isEditing }: { content: ProductsGridBlockContent; isEditing: boolean }) {
  const columns = content.columns || 3
  const limit = content.limit || 6

  // Placeholder products
  const products = Array.from({ length: Math.min(limit, 6) }).map((_, idx) => ({
    id: idx,
    name: `Product ${idx + 1}`,
    price: 29.99 + idx * 10,
    image: null,
  }))

  return (
    <div className="p-6">
      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {products.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <div className="aspect-square bg-muted flex items-center justify-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            </div>
            <CardContent className="p-4">
              <h4 className="font-semibold truncate">{product.name}</h4>
              <p className="text-primary font-bold mt-1">${product.price.toFixed(2)}</p>
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <Button className="w-full" size="sm">Add to Cart</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      {isEditing && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          Products will be loaded from your inventory
        </p>
      )}
    </div>
  )
}

// Product Card Block
function ProductCardBlock({ content, isEditing }: { content: ProductCardBlockContent; isEditing: boolean }) {
  const style = content.style || "full"

  // Placeholder
  const product = {
    name: "Sample Product",
    price: 49.99,
    description: "Product description goes here...",
    image: null,
  }

  if (style === "minimal") {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 p-4 border rounded-lg">
          <div className="w-16 h-16 bg-muted rounded flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold">{product.name}</h4>
            <p className="text-primary font-bold">${product.price.toFixed(2)}</p>
          </div>
          <Button size="sm">Buy</Button>
        </div>
      </div>
    )
  }

  if (style === "compact") {
    return (
      <div className="p-6">
        <Card className="overflow-hidden max-w-xs mx-auto">
          <div className="aspect-square bg-muted flex items-center justify-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardContent className="p-4 text-center">
            <h4 className="font-semibold">{product.name}</h4>
            <p className="text-primary font-bold mt-1">${product.price.toFixed(2)}</p>
            <Button className="mt-3 w-full" size="sm">Add to Cart</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Full style
  return (
    <div className="p-6">
      <Card className="overflow-hidden max-w-lg mx-auto">
        <div className="aspect-video bg-muted flex items-center justify-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground" />
        </div>
        <CardHeader>
          <CardTitle>{product.name}</CardTitle>
          <CardDescription>{product.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-primary">${product.price.toFixed(2)}</p>
        </CardContent>
        <CardFooter>
          <Button className="w-full" size="lg">Add to Cart</Button>
        </CardFooter>
      </Card>
      {isEditing && !content.productId && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          Select a product to display
        </p>
      )}
    </div>
  )
}

// Featured Products Block
function FeaturedProductsBlock({ content, isEditing }: { content: FeaturedProductsBlockContent; isEditing: boolean }) {
  const layout = content.layout || "grid"
  const productIds = content.productIds || []

  // Placeholder products
  const products = (productIds.length > 0 ? productIds : ["1", "2", "3"]).map((id, idx) => ({
    id,
    name: `Featured Product ${idx + 1}`,
    price: 59.99 + idx * 20,
    image: null,
  }))

  if (layout === "slider") {
    return (
      <div className="relative p-6">
        <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
          {products.map((product) => (
            <Card key={product.id} className="flex-none w-64 snap-center overflow-hidden">
              <div className="aspect-square bg-muted flex items-center justify-center">
                <ShoppingBag className="h-12 w-12 text-muted-foreground" />
              </div>
              <CardContent className="p-4">
                <h4 className="font-semibold truncate">{product.name}</h4>
                <p className="text-primary font-bold mt-1">${product.price.toFixed(2)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (layout === "list") {
    return (
      <div className="p-6">
        <div className="space-y-4 max-w-lg mx-auto">
          {products.map((product) => (
            <div key={product.id} className="flex gap-4 p-4 border rounded-lg">
              <div className="w-20 h-20 bg-muted rounded flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">{product.name}</h4>
                <p className="text-primary font-bold mt-1">${product.price.toFixed(2)}</p>
              </div>
              <Button size="sm" variant="outline">View</Button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Grid layout
  return (
    <div className="p-6">
      <div className="grid gap-6 md:grid-cols-3">
        {products.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <div className="aspect-square bg-muted flex items-center justify-center">
              <Star className="h-12 w-12 text-primary/40" />
            </div>
            <CardContent className="p-4">
              <Badge className="mb-2">Featured</Badge>
              <h4 className="font-semibold">{product.name}</h4>
              <p className="text-primary font-bold mt-1">${product.price.toFixed(2)}</p>
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <Button className="w-full">Shop Now</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ============================================
// UTILITY BLOCKS
// ============================================

// Contact Form Block
function ContactFormBlock({ content, isEditing }: { content: ContactFormBlockContent; isEditing: boolean }) {
  const fields = content.fields || [
    { name: "name", type: "text" as const, required: true, placeholder: "Your name" },
    { name: "email", type: "email" as const, required: true, placeholder: "Your email" },
    { name: "message", type: "textarea" as const, required: true, placeholder: "Your message" },
  ]

  return (
    <div className="p-6">
      <form className="max-w-lg mx-auto space-y-4" onSubmit={(e) => e.preventDefault()}>
        {fields.map((field, idx) => (
          <div key={idx}>
            <label className="block text-sm font-medium mb-1 capitalize">
              {field.name}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.type === "textarea" ? (
              <Textarea
                placeholder={field.placeholder}
                required={field.required}
                disabled={isEditing}
                rows={4}
              />
            ) : field.type === "select" ? (
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required={field.required}
                disabled={isEditing}
              >
                <option value="">{field.placeholder || "Select an option"}</option>
                {field.options?.map((opt, i) => (
                  <option key={i} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <Input
                type={field.type}
                placeholder={field.placeholder}
                required={field.required}
                disabled={isEditing}
              />
            )}
          </div>
        ))}
        <Button type="submit" className="w-full" disabled={isEditing}>
          {content.submitText || "Send Message"}
        </Button>
      </form>
    </div>
  )
}

// Newsletter Block
function NewsletterBlock({ content, isEditing }: { content: NewsletterBlockContent; isEditing: boolean }) {
  return (
    <div className="p-8 text-center">
      <div className="max-w-md mx-auto">
        <Mail className="h-12 w-12 mx-auto mb-4 text-primary" />
        <h3 className="text-2xl font-bold">{content.title || "Subscribe to our newsletter"}</h3>
        {content.description && (
          <p className="mt-2 text-muted-foreground">{content.description}</p>
        )}
        <form className="mt-6 flex gap-2" onSubmit={(e) => e.preventDefault()}>
          <Input
            type="email"
            placeholder="Enter your email"
            className="flex-1"
            disabled={isEditing}
          />
          <Button type="submit" disabled={isEditing}>Subscribe</Button>
        </form>
      </div>
    </div>
  )
}

// Map Block
function MapBlock({ content, isEditing }: { content: MapBlockContent; isEditing: boolean }) {
  const address = content.address || "New York, NY"
  const zoom = content.zoom || 14

  if (isEditing) {
    return (
      <div className="p-6">
        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Map: {address}</p>
            <p className="text-xs text-muted-foreground mt-1">Map will be displayed on published site</p>
          </div>
        </div>
      </div>
    )
  }

  // Google Maps embed
  const mapUrl = `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodeURIComponent(address)}&zoom=${zoom}`

  return (
    <div className="p-6">
      <div className="aspect-video w-full overflow-hidden rounded-lg">
        <iframe
          src={mapUrl}
          className="h-full w-full border-0"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  )
}

// FAQ Block
function FAQBlock({ content, isEditing }: { content: FAQBlockContent; isEditing: boolean }) {
  const items = content.items || [
    { question: "Sample question 1?", answer: "Sample answer 1." },
    { question: "Sample question 2?", answer: "Sample answer 2." },
  ]

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 border-y border-dashed bg-muted/30">
        <p className="text-muted-foreground">Add FAQ items</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <Accordion type="single" collapsible className="max-w-2xl mx-auto">
        {items.map((item, idx) => (
          <AccordionItem key={idx} value={`item-${idx}`}>
            <AccordionTrigger className="text-left">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}

// Testimonials Block
function TestimonialsBlock({ content, isEditing }: { content: TestimonialsBlockContent; isEditing: boolean }) {
  const items = content.items || []
  const layout = content.layout || "grid"

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 border-y border-dashed bg-muted/30">
        <p className="text-muted-foreground">Add testimonials</p>
      </div>
    )
  }

  if (layout === "slider") {
    return (
      <div className="relative p-6">
        <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
          {items.map((item, idx) => (
            <Card key={idx} className="flex-none w-80 snap-center">
              <CardContent className="p-6">
                <Quote className="h-8 w-8 text-primary/30 mb-4" />
                <p className="italic text-muted-foreground">&ldquo;{item.quote}&rdquo;</p>
                <div className="flex items-center gap-3 mt-4">
                  <Avatar>
                    <AvatarImage src={item.image} />
                    <AvatarFallback>{item.author[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{item.author}</p>
                    {item.role && <p className="text-sm text-muted-foreground">{item.role}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (layout === "list") {
    return (
      <div className="p-6">
        <div className="space-y-6 max-w-2xl mx-auto">
          {items.map((item, idx) => (
            <div key={idx} className="border-l-4 border-primary pl-6 py-2">
              <p className="italic text-lg">&ldquo;{item.quote}&rdquo;</p>
              <div className="flex items-center gap-3 mt-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={item.image} />
                  <AvatarFallback>{item.author[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{item.author}</p>
                  {item.role && <p className="text-sm text-muted-foreground">{item.role}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Grid layout
  return (
    <div className="p-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item, idx) => (
          <Card key={idx}>
            <CardContent className="p-6">
              <Quote className="h-8 w-8 text-primary/30 mb-4" />
              <p className="italic text-muted-foreground">&ldquo;{item.quote}&rdquo;</p>
              <div className="flex items-center gap-3 mt-4">
                <Avatar>
                  <AvatarImage src={item.image} />
                  <AvatarFallback>{item.author[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{item.author}</p>
                  {item.role && <p className="text-sm text-muted-foreground">{item.role}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// HTML Block
function HTMLBlock({ content, isEditing }: { content: HTMLBlockContent; isEditing: boolean }) {
  if (!content.code) {
    return (
      <div className="flex items-center justify-center p-8 border-y border-dashed bg-muted/30">
        <p className="text-muted-foreground">Add custom HTML code</p>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="p-6">
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium mb-2">Custom HTML Block</p>
          <pre className="text-xs text-muted-foreground overflow-x-auto max-h-40">
            {content.code}
          </pre>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6" dangerouslySetInnerHTML={{ __html: content.code }} />
  )
}

// Placeholder Block for any unimplemented block types
function PlaceholderBlock({ type, isEditing }: { type: string; isEditing: boolean }) {
  return (
    <div className="flex items-center justify-center p-8 border-y border-dashed bg-muted/30">
      <div className="text-center">
        <p className="font-medium capitalize">{type.replace("-", " ")} Block</p>
        <p className="text-sm text-muted-foreground">
          {isEditing ? "Configure this block in the sidebar" : "Block content"}
        </p>
      </div>
    </div>
  )
}
