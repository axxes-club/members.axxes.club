"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { PageBlock, BlockContent, HeroBlockContent, TextBlockContent, HeadingBlockContent, ImageBlockContent, SpacerBlockContent, DividerBlockContent, CTABlockContent } from "@/lib/db/schema"

interface BlockSettingsEditorProps {
  block: PageBlock
  onUpdate: (content: BlockContent) => void
}

export function BlockSettingsEditor({ block, onUpdate }: BlockSettingsEditorProps) {
  const [content, setContent] = useState<BlockContent>(block.content)

  useEffect(() => {
    setContent(block.content)
  }, [block.id, block.content])

  const handleChange = (key: string, value: unknown) => {
    const newContent = { ...content, [key]: value }
    setContent(newContent)
    onUpdate(newContent)
  }

  switch (block.type) {
    case "hero":
      return <HeroSettings content={content as HeroBlockContent} onChange={handleChange} />
    case "text":
      return <TextSettings content={content as TextBlockContent} onChange={handleChange} />
    case "heading":
      return <HeadingSettings content={content as HeadingBlockContent} onChange={handleChange} />
    case "image":
      return <ImageSettings content={content as ImageBlockContent} onChange={handleChange} />
    case "spacer":
      return <SpacerSettings content={content as SpacerBlockContent} onChange={handleChange} />
    case "divider":
      return <DividerSettings content={content as DividerBlockContent} onChange={handleChange} />
    case "cta":
      return <CTASettings content={content as CTABlockContent} onChange={handleChange} />
    default:
      return <GenericSettings content={content} onChange={handleChange} />
  }
}

// Hero Settings
function HeroSettings({
  content,
  onChange,
}: {
  content: HeroBlockContent
  onChange: (key: string, value: unknown) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={content.title || ""}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="Hero title"
        />
      </div>
      <div className="space-y-2">
        <Label>Subtitle</Label>
        <Textarea
          value={content.subtitle || ""}
          onChange={(e) => onChange("subtitle", e.target.value)}
          placeholder="Hero subtitle"
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label>Background Image URL</Label>
        <Input
          value={content.backgroundImage || ""}
          onChange={(e) => onChange("backgroundImage", e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div className="flex items-center justify-between">
        <Label>Overlay</Label>
        <Switch
          checked={content.overlay || false}
          onCheckedChange={(checked) => onChange("overlay", checked)}
        />
      </div>
      {content.overlay && (
        <div className="space-y-2">
          <Label>Overlay Opacity ({content.overlayOpacity || 50}%)</Label>
          <Slider
            value={[content.overlayOpacity || 50]}
            onValueChange={([value]) => onChange("overlayOpacity", value)}
            min={0}
            max={100}
            step={5}
          />
        </div>
      )}
      <div className="space-y-2">
        <Label>CTA Button Text</Label>
        <Input
          value={content.ctaText || ""}
          onChange={(e) => onChange("ctaText", e.target.value)}
          placeholder="Learn More"
        />
      </div>
      <div className="space-y-2">
        <Label>CTA Button Link</Label>
        <Input
          value={content.ctaLink || ""}
          onChange={(e) => onChange("ctaLink", e.target.value)}
          placeholder="/about"
        />
      </div>
      <div className="space-y-2">
        <Label>Alignment</Label>
        <Select
          value={content.alignment || "center"}
          onValueChange={(value) => onChange("alignment", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="right">Right</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// Text Settings
function TextSettings({
  content,
  onChange,
}: {
  content: TextBlockContent
  onChange: (key: string, value: unknown) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Content</Label>
        <Textarea
          value={content.html?.replace(/<[^>]*>/g, "") || ""}
          onChange={(e) => onChange("html", `<p>${e.target.value}</p>`)}
          placeholder="Enter your text..."
          rows={6}
        />
        <p className="text-xs text-muted-foreground">
          Rich text editor coming soon. For now, enter plain text.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Alignment</Label>
        <Select
          value={content.alignment || "left"}
          onValueChange={(value) => onChange("alignment", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="right">Right</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// Heading Settings
function HeadingSettings({
  content,
  onChange,
}: {
  content: HeadingBlockContent
  onChange: (key: string, value: unknown) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Text</Label>
        <Input
          value={content.text || ""}
          onChange={(e) => onChange("text", e.target.value)}
          placeholder="Section Title"
        />
      </div>
      <div className="space-y-2">
        <Label>Heading Level</Label>
        <Select
          value={content.level || "h2"}
          onValueChange={(value) => onChange("level", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="h1">H1 - Main Title</SelectItem>
            <SelectItem value="h2">H2 - Section</SelectItem>
            <SelectItem value="h3">H3 - Subsection</SelectItem>
            <SelectItem value="h4">H4 - Minor Section</SelectItem>
            <SelectItem value="h5">H5 - Small</SelectItem>
            <SelectItem value="h6">H6 - Smallest</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Alignment</Label>
        <Select
          value={content.alignment || "left"}
          onValueChange={(value) => onChange("alignment", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="right">Right</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// Image Settings
function ImageSettings({
  content,
  onChange,
}: {
  content: ImageBlockContent
  onChange: (key: string, value: unknown) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Image URL</Label>
        <Input
          value={content.url || ""}
          onChange={(e) => onChange("url", e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div className="space-y-2">
        <Label>Alt Text</Label>
        <Input
          value={content.alt || ""}
          onChange={(e) => onChange("alt", e.target.value)}
          placeholder="Description of the image"
        />
      </div>
      <div className="space-y-2">
        <Label>Caption</Label>
        <Input
          value={content.caption || ""}
          onChange={(e) => onChange("caption", e.target.value)}
          placeholder="Optional caption"
        />
      </div>
      <div className="space-y-2">
        <Label>Link</Label>
        <Input
          value={content.link || ""}
          onChange={(e) => onChange("link", e.target.value)}
          placeholder="https://... (optional)"
        />
      </div>
      <div className="space-y-2">
        <Label>Size</Label>
        <Select
          value={content.size || "large"}
          onValueChange={(value) => onChange("size", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">Small</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="large">Large</SelectItem>
            <SelectItem value="full">Full Width</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// Spacer Settings
function SpacerSettings({
  content,
  onChange,
}: {
  content: SpacerBlockContent
  onChange: (key: string, value: unknown) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Height ({content.height || 64}px)</Label>
        <Slider
          value={[content.height || 64]}
          onValueChange={([value]) => onChange("height", value)}
          min={16}
          max={256}
          step={8}
        />
      </div>
    </div>
  )
}

// Divider Settings
function DividerSettings({
  content,
  onChange,
}: {
  content: DividerBlockContent
  onChange: (key: string, value: unknown) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Style</Label>
        <Select
          value={content.style || "solid"}
          onValueChange={(value) => onChange("style", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="dashed">Dashed</SelectItem>
            <SelectItem value="dotted">Dotted</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Width</Label>
        <Select
          value={content.width || "full"}
          onValueChange={(value) => onChange("width", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full">Full Width</SelectItem>
            <SelectItem value="half">Half</SelectItem>
            <SelectItem value="third">Third</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// CTA Settings
function CTASettings({
  content,
  onChange,
}: {
  content: CTABlockContent
  onChange: (key: string, value: unknown) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Button Text</Label>
        <Input
          value={content.text || ""}
          onChange={(e) => onChange("text", e.target.value)}
          placeholder="Learn More"
        />
      </div>
      <div className="space-y-2">
        <Label>Link</Label>
        <Input
          value={content.link || ""}
          onChange={(e) => onChange("link", e.target.value)}
          placeholder="/about or https://..."
        />
      </div>
      <div className="space-y-2">
        <Label>Style</Label>
        <Select
          value={content.style || "primary"}
          onValueChange={(value) => onChange("style", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="primary">Primary</SelectItem>
            <SelectItem value="secondary">Secondary</SelectItem>
            <SelectItem value="outline">Outline</SelectItem>
            <SelectItem value="ghost">Ghost</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Size</Label>
        <Select
          value={content.size || "md"}
          onValueChange={(value) => onChange("size", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Small</SelectItem>
            <SelectItem value="md">Medium</SelectItem>
            <SelectItem value="lg">Large</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Alignment</Label>
        <Select
          value={content.alignment || "center"}
          onValueChange={(value) => onChange("alignment", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="right">Right</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// Generic Settings for unimplemented block types
function GenericSettings({
  content,
  onChange,
}: {
  content: BlockContent
  onChange: (key: string, value: unknown) => void
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Settings for this block type are coming soon.
      </p>
      <div className="space-y-2">
        <Label>Raw JSON</Label>
        <Textarea
          value={JSON.stringify(content, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value)
              Object.entries(parsed).forEach(([key, value]) => onChange(key, value))
            } catch {
              // Invalid JSON, ignore
            }
          }}
          rows={10}
          className="font-mono text-xs"
        />
      </div>
    </div>
  )
}
