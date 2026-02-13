"use client"

import { cn } from "@/lib/utils"
import type { PageBlock, BlockContent, HeroBlockContent, TextBlockContent, HeadingBlockContent, ImageBlockContent, SpacerBlockContent, DividerBlockContent, CTABlockContent } from "@/lib/db/schema"
import { Button } from "@/components/ui/button"

interface BlockRendererProps {
  block: PageBlock
  isEditing?: boolean
}

export function BlockRenderer({ block, isEditing = false }: BlockRendererProps) {
  const content = block.content as BlockContent

  switch (block.type) {
    case "hero":
      return <HeroBlock content={content as HeroBlockContent} isEditing={isEditing} />
    case "text":
      return <TextBlock content={content as TextBlockContent} isEditing={isEditing} />
    case "heading":
      return <HeadingBlock content={content as HeadingBlockContent} isEditing={isEditing} />
    case "image":
      return <ImageBlock content={content as ImageBlockContent} isEditing={isEditing} />
    case "spacer":
      return <SpacerBlock content={content as SpacerBlockContent} isEditing={isEditing} />
    case "divider":
      return <DividerBlock content={content as DividerBlockContent} isEditing={isEditing} />
    case "cta":
      return <CTABlock content={content as CTABlockContent} isEditing={isEditing} />
    default:
      return <PlaceholderBlock type={block.type} isEditing={isEditing} />
  }
}

// Hero Block
function HeroBlock({ content, isEditing }: { content: HeroBlockContent; isEditing: boolean }) {
  return (
    <div
      className={cn(
        "relative flex min-h-[300px] flex-col items-center justify-center p-8 text-center",
        content.backgroundImage && "bg-cover bg-center",
        !content.backgroundImage && "bg-gradient-to-br from-primary/10 to-primary/5"
      )}
      style={content.backgroundImage ? { backgroundImage: `url(${content.backgroundImage})` } : undefined}
    >
      {content.overlay && content.backgroundImage && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: (content.overlayOpacity ?? 50) / 100 }}
        />
      )}
      <div className={cn("relative z-10", content.alignment === "left" && "text-left self-start", content.alignment === "right" && "text-right self-end")}>
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
        "prose prose-sm md:prose-base max-w-none p-6",
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

  return (
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

// Placeholder Block for unimplemented block types
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
