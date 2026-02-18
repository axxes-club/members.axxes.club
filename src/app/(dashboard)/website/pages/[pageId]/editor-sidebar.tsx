"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sparkles,
  Type,
  Heading1,
  Image,
  Grid3X3,
  Video,
  ArrowUpDown,
  Minus,
  MousePointerClick,
  User,
  Music,
  Share2,
  CalendarDays,
  PlayCircle,
  Calendar,
  Clock,
  ShoppingBag,
  Package,
  Star,
  Mail,
  Newspaper,
  MapPin,
  HelpCircle,
  Quote,
  Code,
  X,
} from "lucide-react"
import { createBlock, updateBlock } from "@/lib/actions/pages"
import { BLOCK_TYPES, type PageBlock, type BlockType, type BlockContent, type BlockSettings } from "@/lib/db/schema"
import { BlockSettingsEditor } from "./blocks/block-settings-editor"
import type { BrandProfileForEditor } from "@/lib/brand/brand-styles"

interface EditorSidebarProps {
  pageId: string
  selectedBlock: PageBlock | null
  onBlockAdd: (block: PageBlock) => void
  onBlockUpdate: (blockId: string, updates: Partial<PageBlock>) => void
  onBlockDeselect: () => void
  brandProfile?: BrandProfileForEditor | null
}

// Block category definitions
const blockCategories = [
  {
    name: "Layout",
    blocks: [
      { type: "hero" as BlockType, name: "Hero", icon: Sparkles, description: "Full-width hero section" },
      { type: "spacer" as BlockType, name: "Spacer", icon: ArrowUpDown, description: "Vertical spacing" },
      { type: "divider" as BlockType, name: "Divider", icon: Minus, description: "Horizontal line" },
    ],
  },
  {
    name: "Content",
    blocks: [
      { type: "text" as BlockType, name: "Text", icon: Type, description: "Rich text content" },
      { type: "heading" as BlockType, name: "Heading", icon: Heading1, description: "Section heading" },
      { type: "image" as BlockType, name: "Image", icon: Image, description: "Single image" },
      { type: "gallery" as BlockType, name: "Gallery", icon: Grid3X3, description: "Image gallery" },
      { type: "video" as BlockType, name: "Video", icon: Video, description: "Video embed" },
      { type: "cta" as BlockType, name: "Button", icon: MousePointerClick, description: "Call-to-action" },
    ],
  },
  {
    name: "Artist",
    blocks: [
      { type: "artist-bio" as BlockType, name: "Bio", icon: User, description: "Artist biography" },
      { type: "music-links" as BlockType, name: "Music Links", icon: Music, description: "Streaming platforms" },
      { type: "social-links" as BlockType, name: "Social Links", icon: Share2, description: "Social media" },
      { type: "tour-dates" as BlockType, name: "Tour Dates", icon: CalendarDays, description: "Upcoming shows" },
      { type: "music-player" as BlockType, name: "Player", icon: PlayCircle, description: "Embedded player" },
    ],
  },
  {
    name: "Events",
    blocks: [
      { type: "events-list" as BlockType, name: "Events List", icon: Calendar, description: "List of events" },
      { type: "event-card" as BlockType, name: "Event Card", icon: Calendar, description: "Single event" },
      { type: "countdown" as BlockType, name: "Countdown", icon: Clock, description: "Event countdown" },
    ],
  },
  {
    name: "Shop",
    blocks: [
      { type: "products-grid" as BlockType, name: "Products", icon: ShoppingBag, description: "Product grid" },
      { type: "product-card" as BlockType, name: "Product Card", icon: Package, description: "Single product" },
      { type: "featured-products" as BlockType, name: "Featured", icon: Star, description: "Featured items" },
    ],
  },
  {
    name: "Utility",
    blocks: [
      { type: "contact-form" as BlockType, name: "Contact Form", icon: Mail, description: "Contact form" },
      { type: "newsletter" as BlockType, name: "Newsletter", icon: Newspaper, description: "Email signup" },
      { type: "map" as BlockType, name: "Map", icon: MapPin, description: "Location map" },
      { type: "faq" as BlockType, name: "FAQ", icon: HelpCircle, description: "FAQ accordion" },
      { type: "testimonials" as BlockType, name: "Testimonials", icon: Quote, description: "Testimonials" },
      { type: "html" as BlockType, name: "Custom HTML", icon: Code, description: "Custom code" },
    ],
  },
]

// Default content for each block type
const defaultBlockContent: Record<BlockType, BlockContent> = {
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

export function EditorSidebar({
  pageId,
  selectedBlock,
  onBlockAdd,
  onBlockUpdate,
  onBlockDeselect,
  brandProfile,
}: EditorSidebarProps) {
  const [isAddingBlock, setIsAddingBlock] = useState(false)

  const handleAddBlock = async (type: BlockType) => {
    setIsAddingBlock(true)
    try {
      const content = defaultBlockContent[type]
      const block = await createBlock(pageId, type, content)
      onBlockAdd(block)
    } catch (error) {
      console.error("Failed to add block:", error)
    } finally {
      setIsAddingBlock(false)
    }
  }

  const handleContentUpdate = async (content: BlockContent) => {
    if (!selectedBlock) return
    await updateBlock(selectedBlock.id, { content })
    onBlockUpdate(selectedBlock.id, { content })
  }

  const handleSettingsUpdate = async (settings: BlockSettings) => {
    if (!selectedBlock) return
    await updateBlock(selectedBlock.id, { settings })
    onBlockUpdate(selectedBlock.id, { settings })
  }

  return (
    <div className="w-80 border-l bg-background flex flex-col">
      {selectedBlock ? (
        <>
          {/* Block Editor Header */}
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h3 className="font-medium capitalize">
                {selectedBlock.type.replace("-", " ")} Block
              </h3>
              <p className="text-sm text-muted-foreground">Edit block content</p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onBlockDeselect}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Block Settings */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              <BlockSettingsEditor
                block={selectedBlock}
                onUpdateContent={handleContentUpdate}
                onUpdateSettings={handleSettingsUpdate}
                brandProfile={brandProfile}
              />
            </div>
          </ScrollArea>
        </>
      ) : (
        <>
          {/* Block Picker Header */}
          <div className="border-b p-4">
            <h3 className="font-medium">Add Block</h3>
            <p className="text-sm text-muted-foreground">
              Choose a block type to add
            </p>
          </div>

          {/* Block Categories */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {blockCategories.map((category) => (
                <div key={category.name}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    {category.name}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {category.blocks.map((block) => (
                      <button
                        key={block.type}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                        onClick={() => handleAddBlock(block.type)}
                        disabled={isAddingBlock}
                      >
                        <block.icon className="h-5 w-5" />
                        <span className="text-xs font-medium">{block.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  )
}
