"use client"

import React from "react"

// ============================================
// LAYOUT BLOCKS
// ============================================

export function HeroBlock({
  title,
  subtitle,
  backgroundImage,
  backgroundVideo,
  ctaText,
  ctaLink,
  overlay,
  overlayOpacity,
  alignment,
}: {
  title?: string
  subtitle?: string
  backgroundImage?: string
  backgroundVideo?: string
  ctaText?: string
  ctaLink?: string
  overlay?: boolean
  overlayOpacity?: number
  alignment?: "left" | "center" | "right"
}) {
  const style: React.CSSProperties = backgroundImage
    ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : {}

  return (
    <div
      style={style}
      className={`relative flex min-h-[400px] flex-col items-center justify-center p-8 text-center ${
        !backgroundImage && !backgroundVideo ? "bg-gradient-to-br from-primary/10 to-primary/5" : ""
      } ${alignment === "left" ? "items-start text-left" : alignment === "right" ? "items-end text-right" : ""}`}
    >
      {backgroundVideo && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={backgroundVideo}
          autoPlay
          muted
          loop
          playsInline
        />
      )}
      {overlay && (backgroundImage || backgroundVideo) && (
        <div className="absolute inset-0 bg-black" style={{ opacity: (overlayOpacity ?? 50) / 100 }} />
      )}
      <div className="relative z-10 max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
          {title || "Hero Title"}
        </h1>
        {subtitle && (
          <p className="mt-4 text-lg text-muted-foreground md:text-xl">
            {subtitle}
          </p>
        )}
        {ctaText && (
          <a
            href={ctaLink || "#"}
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90"
          >
            {ctaText}
          </a>
        )}
      </div>
    </div>
  )
}

export function SpacerBlock({ height = 64 }: { height?: number }) {
  return <div style={{ height }} aria-hidden="true" />
}

export function DividerBlock({
  style = "solid",
  width = "full",
}: {
  style?: "solid" | "dashed" | "dotted"
  width?: "full" | "half" | "third"
}) {
  const widthClass = width === "full" ? "w-full" : width === "half" ? "w-1/2" : "w-1/3"
  const styleClass = style === "dashed" ? "border-dashed" : style === "dotted" ? "border-dotted" : ""
  return (
    <div className="flex justify-center py-6">
      <hr className={`border-t ${widthClass} ${styleClass}`} />
    </div>
  )
}

// ============================================
// CONTENT BLOCKS
// ============================================

export function TextBlock({
  html = "<p>Enter your text here...</p>",
  alignment = "left",
}: {
  html?: string
  alignment?: "left" | "center" | "right"
}) {
  const alignClass = alignment === "center" ? "text-center" : alignment === "right" ? "text-right" : ""
  return (
    <div
      className={`prose prose-sm md:prose-base dark:prose-invert max-w-none p-6 ${alignClass}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export function HeadingBlock({
  text = "Section Title",
  level = "h2",
  alignment = "left",
}: {
  text?: string
  level?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
  alignment?: "left" | "center" | "right"
}) {
  const sizes: Record<string, string> = {
    h1: "text-4xl font-bold",
    h2: "text-3xl font-bold",
    h3: "text-2xl font-semibold",
    h4: "text-xl font-semibold",
    h5: "text-lg font-medium",
    h6: "text-base font-medium",
  }
  const alignClass = alignment === "center" ? "text-center" : alignment === "right" ? "text-right" : ""
  
  const headingProps = {
    className: sizes[level],
    children: text,
  }
  
  return (
    <div className={`p-6 ${alignClass}`}>
      {level === "h1" && <h1 {...headingProps} />}
      {level === "h2" && <h2 {...headingProps} />}
      {level === "h3" && <h3 {...headingProps} />}
      {level === "h4" && <h4 {...headingProps} />}
      {level === "h5" && <h5 {...headingProps} />}
      {level === "h6" && <h6 {...headingProps} />}
    </div>
  )
}

export function ImageBlock({
  url,
  alt,
  caption,
  link,
  size = "large",
}: {
  url?: string
  alt?: string
  caption?: string
  link?: string
  size?: "small" | "medium" | "large" | "full"
}) {
  const sizeClass = size === "small" ? "max-w-sm" : size === "medium" ? "max-w-lg" : size === "large" ? "max-w-2xl" : "max-w-full"

  if (!url) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className={`aspect-video w-full rounded-lg bg-muted flex items-center justify-center ${sizeClass}`}>
          <p className="text-muted-foreground">Add an image URL</p>
        </div>
      </div>
    )
  }

  const content = (
    <figure className="p-6">
      <div className={`relative mx-auto aspect-video ${sizeClass}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt || ""} className="rounded-lg object-cover w-full h-full" />
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  )

  if (link) {
    return <a href={link}>{content}</a>
  }
  return content
}

export function GalleryBlock({
  images = [],
  layout: _layout = "grid",
  columns = 3,
}: {
  images?: Array<{ url: string; alt?: string; caption?: string }>
  layout?: "grid" | "masonry" | "slider"
  columns?: number
}) {
  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 border-y border-dashed bg-muted/30">
        <p className="text-muted-foreground">Add images to create a gallery</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {images.map((img, idx) => (
          <div key={idx} className="relative aspect-video">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.alt || ""} className="rounded-lg object-cover w-full h-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function VideoBlock({
  url,
  autoplay,
  muted,
  loop,
}: {
  url?: string
  autoplay?: boolean
  muted?: boolean
  loop?: boolean
}) {
  if (!url) {
    return (
      <div className="flex items-center justify-center p-8 border-y border-dashed bg-muted/30">
        <p className="text-muted-foreground">Add a video URL</p>
      </div>
    )
  }

  // Check if it's a YouTube or Vimeo URL
  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be")
  const isVimeo = url.includes("vimeo.com")

  if (isYouTube || isVimeo) {
    let embedUrl = url
    if (isYouTube) {
      const videoId = url.includes("youtu.be")
        ? url.split("/").pop()
        : new URLSearchParams(new URL(url).search).get("v")
      embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&mute=${muted ? 1 : 0}&loop=${loop ? 1 : 0}`
    } else if (isVimeo) {
      const videoId = url.split("/").pop()
      embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=${autoplay ? 1 : 0}&muted=${muted ? 1 : 0}&loop=${loop ? 1 : 0}`
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
        src={url}
        className="w-full rounded-lg"
        controls
        autoPlay={autoplay}
        muted={muted}
        loop={loop}
      />
    </div>
  )
}

export function CTABlock({
  text = "Button",
  link = "#",
  style = "primary",
  size = "md",
  alignment = "center",
}: {
  text?: string
  link?: string
  style?: "primary" | "secondary" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
  alignment?: "left" | "center" | "right"
}) {
  const styleClasses: Record<string, string> = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
  }
  const sizeClasses: Record<string, string> = {
    sm: "h-9 rounded-md px-3 text-xs",
    md: "h-10 px-4 py-2 text-sm",
    lg: "h-11 rounded-md px-8 text-base",
  }
  const alignClass = alignment === "center" ? "text-center" : alignment === "right" ? "text-right" : "text-left"

  return (
    <div className={`p-6 ${alignClass}`}>
      <a
        href={link}
        className={`inline-flex items-center justify-center rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${styleClasses[style]} ${sizeClasses[size]}`}
      >
        {text}
      </a>
    </div>
  )
}

// ============================================
// ARTIST BLOCKS
// ============================================

export function ArtistBioBlock({
  name = "Artist Name",
  genres = "",
  bio = "",
  image,
}: {
  name?: string
  genres?: string
  bio?: string
  image?: string
}) {
  const genreList = genres.split(",").map(g => g.trim()).filter(Boolean)

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={name}
            width={192}
            height={192}
            className="rounded-full object-cover flex-shrink-0 w-48 h-48"
          />
        ) : (
          <div className="w-48 h-48 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <span className="text-4xl text-muted-foreground">♪</span>
          </div>
        )}
        <div className="flex-1">
          <h2 className="text-3xl font-bold">{name}</h2>
          {genreList.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {genreList.map((genre, idx) => (
                <span key={idx} className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                  {genre}
                </span>
              ))}
            </div>
          )}
          {bio && (
            <p className="mt-4 text-muted-foreground leading-relaxed">{bio}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function MusicLinksBlock({
  platforms = [],
  style: _style = "buttons",
}: {
  platforms?: Array<{ name: string; url: string }>
  style?: "icons" | "buttons" | "list"
}) {
  if (platforms.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 border-y border-dashed bg-muted/30">
        <p className="text-muted-foreground">Add music platform links</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-center gap-3">
        {platforms.map((platform, idx) => (
          <a
            key={idx}
            href={platform.url}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            {platform.name}
          </a>
        ))}
      </div>
    </div>
  )
}

export function SocialLinksBlock({
  platforms = [],
  style: _style = "icons",
}: {
  platforms?: Array<{ name: string; url: string }>
  style?: "icons" | "buttons"
}) {
  if (platforms.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 border-y border-dashed bg-muted/30">
        <p className="text-muted-foreground">Add social media links</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-center gap-4">
        {platforms.map((platform, idx) => (
          <a
            key={idx}
            href={platform.url}
            className="p-3 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            title={platform.name}
          >
            {platform.name.charAt(0).toUpperCase()}
          </a>
        ))}
      </div>
    </div>
  )
}

export function TourDatesBlock({
  limit = 5,
}: {
  limit?: number
  showPast?: boolean
}) {
  return (
    <div className="p-6">
      <div className="space-y-4">
        {Array.from({ length: Math.min(limit, 3) }).map((_, idx) => (
          <div key={idx} className="flex items-center gap-4 p-4 border rounded-lg">
            <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-lg flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-primary">{15 + idx}</span>
              <span className="text-xs text-muted-foreground">MAR</span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate">Sample Venue {idx + 1}</h4>
              <p className="text-sm text-muted-foreground">City, Country</p>
            </div>
            <a
              href="#"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-xs font-medium hover:bg-accent"
            >
              Tickets
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MusicPlayerBlock({
  platform = "spotify",
  embedId,
  type = "track",
}: {
  platform?: "spotify" | "soundcloud" | "apple" | "youtube"
  embedId?: string
  type?: "track" | "album" | "playlist"
}) {
  if (!embedId) {
    return (
      <div className="flex items-center justify-center p-8 border-y border-dashed bg-muted/30">
        <p className="text-muted-foreground">Add a music embed ID</p>
      </div>
    )
  }

  let embedUrl = ""
  switch (platform) {
    case "spotify":
      embedUrl = `https://open.spotify.com/embed/${type}/${embedId}`
      break
    case "soundcloud":
      embedUrl = `https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/${embedId}`
      break
    case "apple":
      embedUrl = `https://embed.music.apple.com/us/${type}/${embedId}`
      break
    case "youtube":
      embedUrl = `https://www.youtube.com/embed/${embedId}`
      break
  }

  return (
    <div className="p-6">
      <div className={`w-full overflow-hidden rounded-lg ${platform === "spotify" && type === "track" ? "h-20" : "h-96"}`}>
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

// Fixed reference date for placeholder events (March 15, 2026)
const PLACEHOLDER_EVENT_DATE = new Date(2026, 2, 15)

export function EventsListBlock({
  limit = 6,
  layout: _layout = "cards",
}: {
  limit?: number
  layout?: "list" | "grid" | "cards"
}) {
  const events = Array.from({ length: Math.min(limit, 4) }).map((_, idx) => ({
    id: idx,
    title: `Event ${idx + 1}`,
    date: new Date(PLACEHOLDER_EVENT_DATE.getTime() + idx * 7 * 24 * 60 * 60 * 1000),
    venue: `Venue ${idx + 1}`,
    location: "City, Country",
  }))

  if (_layout === "cards") {
    return (
      <div className="p-6">
        <div className="grid gap-6 md:grid-cols-2">
          {events.map((event) => (
            <div key={event.id} className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5" />
              <div className="p-6">
                <h3 className="text-2xl font-semibold leading-none tracking-tight">{event.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                  {event.date.toLocaleDateString()}
                </p>
              </div>
              <div className="p-6 pt-0">
                <a
                  href="#"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground w-full"
                >
                  Get Tickets
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

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
            <a
              href="#"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-xs font-medium"
            >
              Tickets
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

export function EventCardBlock({
  style = "full",
}: {
  style?: "full" | "compact" | "minimal"
}) {
  const event = {
    title: "Sample Event",
    date: new Date(PLACEHOLDER_EVENT_DATE.getTime() + 7 * 24 * 60 * 60 * 1000),
    venue: "Sample Venue",
    location: "City, Country",
    description: "Event description goes here...",
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
          <a
            href="#"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-xs font-medium"
          >
            Tickets
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm max-w-lg mx-auto">
        <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <span className="text-6xl text-primary/40">📅</span>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {event.date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
          <h3 className="text-2xl font-semibold mt-2">{event.title}</h3>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            📍 {event.venue} • {event.location}
          </p>
          <p className="text-muted-foreground mt-4">{event.description}</p>
        </div>
        <div className="p-6 pt-0">
          <a
            href="#"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground w-full"
          >
            Get Tickets
          </a>
        </div>
      </div>
    </div>
  )
}

export function CountdownBlock({
  targetDate,
  title = "Coming Soon",
}: {
  targetDate?: string
  title?: string
}) {
  // Default to 30 days from fixed reference date
  const target = targetDate ? new Date(targetDate) : new Date(PLACEHOLDER_EVENT_DATE.getTime() + 30 * 24 * 60 * 60 * 1000)
  const now = new Date()
  const diff = Math.max(0, target.getTime() - now.getTime())
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return (
    <div className="p-8 text-center">
      {title && <h3 className="text-2xl font-bold mb-6">{title}</h3>}
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

export function ProductsGridBlock({
  limit = 6,
  columns = 3,
}: {
  categoryId?: string
  limit?: number
  columns?: number
}) {
  const products = Array.from({ length: Math.min(limit, 6) }).map((_, idx) => ({
    id: idx,
    name: `Product ${idx + 1}`,
    price: 29.99 + idx * 10,
  }))

  return (
    <div className="p-6">
      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {products.map((product) => (
          <div key={product.id} className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="aspect-square bg-muted flex items-center justify-center">
              <span className="text-4xl text-muted-foreground">🛍️</span>
            </div>
            <div className="p-4">
              <h4 className="font-semibold truncate">{product.name}</h4>
              <p className="text-primary font-bold mt-1">${product.price.toFixed(2)}</p>
            </div>
            <div className="p-4 pt-0">
              <a
                href="#"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground w-full"
              >
                Add to Cart
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProductCardBlock({
  style = "full",
}: {
  style?: "full" | "compact" | "minimal"
}) {
  const product = {
    name: "Sample Product",
    price: 49.99,
    description: "Product description goes here...",
  }

  if (style === "minimal") {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 p-4 border rounded-lg">
          <div className="w-16 h-16 bg-muted rounded flex items-center justify-center flex-shrink-0">
            <span className="text-2xl text-muted-foreground">🛍️</span>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold">{product.name}</h4>
            <p className="text-primary font-bold">${product.price.toFixed(2)}</p>
          </div>
          <a
            href="#"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-xs font-medium"
          >
            Buy
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm max-w-lg mx-auto">
        <div className="aspect-video bg-muted flex items-center justify-center">
          <span className="text-6xl text-muted-foreground">🛍️</span>
        </div>
        <div className="p-6">
          <h3 className="text-2xl font-semibold">{product.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
        </div>
        <div className="p-6 pt-0">
          <p className="text-2xl font-bold text-primary">${product.price.toFixed(2)}</p>
          <a
            href="#"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground w-full mt-4"
          >
            Add to Cart
          </a>
        </div>
      </div>
    </div>
  )
}

export function FeaturedProductsBlock({
  layout: _layout = "grid",
}: {
  layout?: "grid" | "slider" | "list"
}) {
  const products = Array.from({ length: 3 }).map((_, idx) => ({
    id: idx,
    name: `Featured Product ${idx + 1}`,
    price: 59.99 + idx * 20,
  }))

  return (
    <div className="p-6">
      <div className="grid gap-6 md:grid-cols-3">
        {products.map((product) => (
          <div key={product.id} className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="aspect-square bg-muted flex items-center justify-center">
              <span className="text-4xl text-primary/40">⭐</span>
            </div>
            <div className="p-4">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                Featured
              </span>
              <h4 className="font-semibold mt-2">{product.name}</h4>
              <p className="text-primary font-bold mt-1">${product.price.toFixed(2)}</p>
            </div>
            <div className="p-4 pt-0">
              <a
                href="#"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground w-full"
              >
                Shop Now
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// UTILITY BLOCKS
// ============================================

export function ContactFormBlock({
  fields = [],
  submitText = "Send Message",
}: {
  fields?: Array<{
    name: string
    type: "text" | "email" | "textarea" | "select"
    required?: boolean
    placeholder?: string
    options?: string[]
  }>
  submitText?: string
}) {
  const defaultFields = fields.length === 0 ? [
    { name: "name", type: "text" as const, required: true, placeholder: "Your name" },
    { name: "email", type: "email" as const, required: true, placeholder: "Your email" },
    { name: "message", type: "textarea" as const, required: true, placeholder: "Your message" },
  ] : fields

  return (
    <div className="p-6">
      <form className="max-w-lg mx-auto space-y-4" onSubmit={(e) => e.preventDefault()}>
        {defaultFields.map((field, idx) => (
          <div key={idx}>
            <label className="block text-sm font-medium mb-1 capitalize">
              {field.name}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.type === "textarea" ? (
              <textarea
                placeholder={field.placeholder}
                required={field.required}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            ) : (
              <input
                type={field.type}
                placeholder={field.placeholder}
                required={field.required}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            )}
          </div>
        ))}
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground w-full"
        >
          {submitText}
        </button>
      </form>
    </div>
  )
}

export function NewsletterBlock({
  title = "Subscribe to our newsletter",
  description,
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="p-8 text-center">
      <div className="max-w-md mx-auto">
        <span className="text-4xl mb-4 block">✉️</span>
        <h3 className="text-2xl font-bold">{title}</h3>
        {description && (
          <p className="mt-2 text-muted-foreground">{description}</p>
        )}
        <form className="mt-6 flex gap-2" onSubmit={(e) => e.preventDefault()}>
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Subscribe
          </button>
        </form>
      </div>
    </div>
  )
}

export function MapBlock({
  address = "New York, NY",
}: {
  address?: string
  zoom?: number
}) {
  return (
    <div className="p-6">
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl mb-2 block">📍</span>
          <p className="text-muted-foreground">Map: {address}</p>
        </div>
      </div>
    </div>
  )
}

export function FAQBlock({
  items = [],
}: {
  items?: Array<{ question: string; answer: string }>
}) {
  const defaultItems = items.length === 0 ? [
    { question: "Sample question 1?", answer: "Sample answer 1." },
    { question: "Sample question 2?", answer: "Sample answer 2." },
  ] : items

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        {defaultItems.map((item, idx) => (
          <div key={idx} className="border rounded-lg">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-medium">
                {item.question}
                <span className="transition group-open:rotate-180">▼</span>
              </summary>
              <p className="px-4 pb-4 text-muted-foreground">{item.answer}</p>
            </details>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TestimonialsBlock({
  items = [],
  layout: _layout = "grid",
}: {
  items?: Array<{ quote: string; author: string; role?: string; image?: string }>
  layout?: "grid" | "slider" | "list"
}) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 border-y border-dashed bg-muted/30">
        <p className="text-muted-foreground">Add testimonials</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item, idx) => (
          <div key={idx} className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              <span className="text-3xl text-primary/30 mb-4 block">&ldquo;</span>
              <p className="italic text-muted-foreground">{item.quote}</p>
              <div className="flex items-center gap-3 mt-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  {item.author.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold">{item.author}</p>
                  {item.role && <p className="text-sm text-muted-foreground">{item.role}</p>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function HTMLBlock({
  code,
}: {
  code?: string
}) {
  if (!code) {
    return (
      <div className="flex items-center justify-center p-8 border-y border-dashed bg-muted/30">
        <p className="text-muted-foreground">Add custom HTML code</p>
      </div>
    )
  }
  return <div className="p-6" dangerouslySetInnerHTML={{ __html: code }} />
}