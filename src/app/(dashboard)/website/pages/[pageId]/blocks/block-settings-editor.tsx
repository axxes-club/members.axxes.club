"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Settings,
  Paintbrush,
  Type,
  Box,
  Layers,
  Sparkles,
  Code,
  Palette,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Smartphone,
  Monitor,
  Tablet,
} from "lucide-react"
import type {
  PageBlock,
  BlockContent,
  BlockSettings,
  BlockStyleOverrides,
  HeroBlockContent,
  TextBlockContent,
  HeadingBlockContent,
  ImageBlockContent,
  SpacerBlockContent,
  DividerBlockContent,
  CTABlockContent,
  GalleryBlockContent,
  VideoBlockContent,
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
import type { BrandProfileForEditor } from "@/lib/brand/brand-styles"

interface BlockSettingsEditorProps {
  block: PageBlock
  onUpdateContent: (content: BlockContent) => void
  onUpdateSettings: (settings: BlockSettings) => void
  brandProfile?: BrandProfileForEditor | null
}

export function BlockSettingsEditor({
  block,
  onUpdateContent,
  onUpdateSettings,
  brandProfile,
}: BlockSettingsEditorProps) {
  const [content, setContent] = useState<BlockContent>(block.content)
  const [settings, setSettings] = useState<BlockSettings>(block.settings || {})
  const [activeTab, setActiveTab] = useState("content")
  const [responsiveMode, setResponsiveMode] = useState<"base" | "sm" | "md" | "lg" | "xl">("base")

  useEffect(() => {
    setContent(block.content)
    setSettings(block.settings || {})
  }, [block.id, block.content, block.settings])

  const handleContentChange = (key: string, value: unknown) => {
    const newContent = { ...content, [key]: value }
    setContent(newContent)
    onUpdateContent(newContent)
  }

  const handleSettingsChange = (path: string[], value: unknown) => {
    const newSettings = { ...settings }
    let current: Record<string, unknown> = newSettings

    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {}
      }
      current = current[path[i]] as Record<string, unknown>
    }
    current[path[path.length - 1]] = value

    setSettings(newSettings)
    onUpdateSettings(newSettings)
  }

  const handleOverridesChange = (category: keyof BlockStyleOverrides, key: string, value: unknown) => {
    if (responsiveMode === "base") {
      handleSettingsChange(["overrides", category, key], value)
    } else {
      handleSettingsChange(["responsive", responsiveMode, category, key], value)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getOverrideValue = (category: keyof BlockStyleOverrides, key: string): any => {
    if (responsiveMode === "base") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (settings.overrides?.[category] as Record<string, any>)?.[key]
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (settings.responsive?.[responsiveMode]?.[category] as Record<string, any>)?.[key]
  }

  const resetOverrides = () => {
    if (responsiveMode === "base") {
      handleSettingsChange(["overrides"], {})
    } else {
      handleSettingsChange(["responsive", responsiveMode], {})
    }
  }

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full grid grid-cols-4 shrink-0">
          <TabsTrigger value="content" className="text-xs">
            <Settings className="h-3 w-3 mr-1" />
            Content
          </TabsTrigger>
          <TabsTrigger value="style" className="text-xs">
            <Paintbrush className="h-3 w-3 mr-1" />
            Style
          </TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs">
            <Layers className="h-3 w-3 mr-1" />
            Advanced
          </TabsTrigger>
          <TabsTrigger value="code" className="text-xs">
            <Code className="h-3 w-3 mr-1" />
            CSS
          </TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="flex-1 overflow-y-auto p-4 space-y-4">
          <ContentEditor
            blockType={block.type}
            content={content}
            onChange={handleContentChange}
          />
        </TabsContent>

        {/* Style Tab */}
        <TabsContent value="style" className="flex-1 overflow-y-auto">
          {/* Responsive Mode Selector */}
          <div className="sticky top-0 bg-background z-10 border-b p-2">
            <div className="flex items-center gap-1">
              <Button
                variant={responsiveMode === "base" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setResponsiveMode("base")}
                className="h-7 px-2 text-xs"
              >
                <Monitor className="h-3 w-3 mr-1" />
                Base
              </Button>
              <Button
                variant={responsiveMode === "sm" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setResponsiveMode("sm")}
                className="h-7 px-2 text-xs"
              >
                <Smartphone className="h-3 w-3" />
              </Button>
              <Button
                variant={responsiveMode === "md" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setResponsiveMode("md")}
                className="h-7 px-2 text-xs"
              >
                <Tablet className="h-3 w-3" />
              </Button>
              <Button
                variant={responsiveMode === "lg" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setResponsiveMode("lg")}
                className="h-7 px-2 text-xs"
              >
                <Monitor className="h-3 w-3" />
              </Button>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={resetOverrides}
                className="h-7 px-2 text-xs text-muted-foreground"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>
            {responsiveMode !== "base" && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Editing {responsiveMode.toUpperCase()} breakpoint overrides
              </p>
            )}
          </div>

          <div className="p-4 space-y-2">
            {/* Brand Integration */}
            {brandProfile && (
              <StyleSection title="Brand Integration" icon={<Palette className="h-4 w-4" />} defaultOpen>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Use Brand Colors</Label>
                    <Switch
                      checked={settings.brand?.useBrandColors ?? true}
                      onCheckedChange={(v) => handleSettingsChange(["brand", "useBrandColors"], v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Use Brand Fonts</Label>
                    <Switch
                      checked={settings.brand?.useBrandFonts ?? true}
                      onCheckedChange={(v) => handleSettingsChange(["brand", "useBrandFonts"], v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Use Brand Radius</Label>
                    <Switch
                      checked={settings.brand?.useBrandRadius ?? true}
                      onCheckedChange={(v) => handleSettingsChange(["brand", "useBrandRadius"], v)}
                    />
                  </div>
                  {brandProfile.primaryColor && (
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: brandProfile.primaryColor }}
                      />
                      <span className="text-muted-foreground">Primary: {brandProfile.primaryColor}</span>
                    </div>
                  )}
                </div>
              </StyleSection>
            )}

            {/* Typography */}
            <StyleSection title="Typography" icon={<Type className="h-4 w-4" />}>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Font Family</Label>
                  <Select
                    value={getOverrideValue("typography", "fontFamily") as string || ""}
                    onValueChange={(v) => handleOverridesChange("typography", "fontFamily", v || undefined)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Inherit from brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Inherit from brand</SelectItem>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                      <SelectItem value="Open Sans">Open Sans</SelectItem>
                      <SelectItem value="Montserrat">Montserrat</SelectItem>
                      <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                      <SelectItem value="Oswald">Oswald</SelectItem>
                      <SelectItem value="system-ui">System UI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Font Size</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="e.g. 16px, 1rem"
                      value={getOverrideValue("typography", "fontSize") as string || ""}
                      onChange={(e) => handleOverridesChange("typography", "fontSize", e.target.value || undefined)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Font Weight</Label>
                    <Select
                      value={String(getOverrideValue("typography", "fontWeight") || "")}
                      onValueChange={(v) => handleOverridesChange("typography", "fontWeight", v || undefined)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Inherit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Inherit</SelectItem>
                        <SelectItem value="300">Light (300)</SelectItem>
                        <SelectItem value="400">Normal (400)</SelectItem>
                        <SelectItem value="500">Medium (500)</SelectItem>
                        <SelectItem value="600">Semibold (600)</SelectItem>
                        <SelectItem value="700">Bold (700)</SelectItem>
                        <SelectItem value="800">Extra Bold (800)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Line Height</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="e.g. 1.5, 24px"
                      value={getOverrideValue("typography", "lineHeight") as string || ""}
                      onChange={(e) => handleOverridesChange("typography", "lineHeight", e.target.value || undefined)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Letter Spacing</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="e.g. 0.05em"
                      value={getOverrideValue("typography", "letterSpacing") as string || ""}
                      onChange={(e) => handleOverridesChange("typography", "letterSpacing", e.target.value || undefined)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Text Transform</Label>
                  <Select
                    value={getOverrideValue("typography", "textTransform") as string || ""}
                    onValueChange={(v) => handleOverridesChange("typography", "textTransform", v || undefined)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      <SelectItem value="uppercase">UPPERCASE</SelectItem>
                      <SelectItem value="lowercase">lowercase</SelectItem>
                      <SelectItem value="capitalize">Capitalize</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </StyleSection>

            {/* Colors */}
            <StyleSection title="Colors" icon={<Paintbrush className="h-4 w-4" />}>
              <div className="space-y-3">
                <ColorInput
                  label="Text Color"
                  value={getOverrideValue("colors", "text") as string}
                  onChange={(v) => handleOverridesChange("colors", "text", v)}
                  brandColors={brandProfile}
                />
                <ColorInput
                  label="Background"
                  value={getOverrideValue("colors", "background") as string}
                  onChange={(v) => handleOverridesChange("colors", "background", v)}
                  brandColors={brandProfile}
                />
                <ColorInput
                  label="Accent"
                  value={getOverrideValue("colors", "accent") as string}
                  onChange={(v) => handleOverridesChange("colors", "accent", v)}
                  brandColors={brandProfile}
                />
                <ColorInput
                  label="Link Color"
                  value={getOverrideValue("colors", "link") as string}
                  onChange={(v) => handleOverridesChange("colors", "link", v)}
                  brandColors={brandProfile}
                />
                <ColorInput
                  label="Heading Color"
                  value={getOverrideValue("colors", "heading") as string}
                  onChange={(v) => handleOverridesChange("colors", "heading", v)}
                  brandColors={brandProfile}
                />
              </div>
            </StyleSection>

            {/* Spacing */}
            <StyleSection title="Spacing" icon={<Box className="h-4 w-4" />}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Padding</Label>
                  <div className="grid grid-cols-4 gap-1">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Top</Label>
                      <Input
                        className="h-7 text-xs text-center"
                        placeholder="0"
                        value={getOverrideValue("spacing", "padding")?.top || ""}
                        onChange={(e) => {
                          const current = getOverrideValue("spacing", "padding") || {}
                          handleOverridesChange("spacing", "padding", { ...current, top: e.target.value || undefined })
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Right</Label>
                      <Input
                        className="h-7 text-xs text-center"
                        placeholder="0"
                        value={getOverrideValue("spacing", "padding")?.right || ""}
                        onChange={(e) => {
                          const current = getOverrideValue("spacing", "padding") || {}
                          handleOverridesChange("spacing", "padding", { ...current, right: e.target.value || undefined })
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Bottom</Label>
                      <Input
                        className="h-7 text-xs text-center"
                        placeholder="0"
                        value={getOverrideValue("spacing", "padding")?.bottom || ""}
                        onChange={(e) => {
                          const current = getOverrideValue("spacing", "padding") || {}
                          handleOverridesChange("spacing", "padding", { ...current, bottom: e.target.value || undefined })
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Left</Label>
                      <Input
                        className="h-7 text-xs text-center"
                        placeholder="0"
                        value={getOverrideValue("spacing", "padding")?.left || ""}
                        onChange={(e) => {
                          const current = getOverrideValue("spacing", "padding") || {}
                          handleOverridesChange("spacing", "padding", { ...current, left: e.target.value || undefined })
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Margin</Label>
                  <div className="grid grid-cols-4 gap-1">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Top</Label>
                      <Input
                        className="h-7 text-xs text-center"
                        placeholder="0"
                        value={getOverrideValue("spacing", "margin")?.top || ""}
                        onChange={(e) => {
                          const current = getOverrideValue("spacing", "margin") || {}
                          handleOverridesChange("spacing", "margin", { ...current, top: e.target.value || undefined })
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Right</Label>
                      <Input
                        className="h-7 text-xs text-center"
                        placeholder="0"
                        value={getOverrideValue("spacing", "margin")?.right || ""}
                        onChange={(e) => {
                          const current = getOverrideValue("spacing", "margin") || {}
                          handleOverridesChange("spacing", "margin", { ...current, right: e.target.value || undefined })
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Bottom</Label>
                      <Input
                        className="h-7 text-xs text-center"
                        placeholder="0"
                        value={getOverrideValue("spacing", "margin")?.bottom || ""}
                        onChange={(e) => {
                          const current = getOverrideValue("spacing", "margin") || {}
                          handleOverridesChange("spacing", "margin", { ...current, bottom: e.target.value || undefined })
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Left</Label>
                      <Input
                        className="h-7 text-xs text-center"
                        placeholder="0"
                        value={getOverrideValue("spacing", "margin")?.left || ""}
                        onChange={(e) => {
                          const current = getOverrideValue("spacing", "margin") || {}
                          handleOverridesChange("spacing", "margin", { ...current, left: e.target.value || undefined })
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Gap (for flex/grid)</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="e.g. 16px, 1rem"
                    value={getOverrideValue("spacing", "gap") as string || ""}
                    onChange={(e) => handleOverridesChange("spacing", "gap", e.target.value || undefined)}
                  />
                </div>
              </div>
            </StyleSection>

            {/* Background */}
            <StyleSection title="Background" icon={<Layers className="h-4 w-4" />}>
              <div className="space-y-3">
                <ColorInput
                  label="Background Color"
                  value={getOverrideValue("background", "color") as string}
                  onChange={(v) => handleOverridesChange("background", "color", v)}
                  brandColors={brandProfile}
                />
                <div className="space-y-1">
                  <Label className="text-xs">Gradient</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="e.g. linear-gradient(to right, #000, #fff)"
                    value={getOverrideValue("background", "gradient") as string || ""}
                    onChange={(e) => handleOverridesChange("background", "gradient", e.target.value || undefined)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Background Image</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="url(https://...)"
                    value={getOverrideValue("background", "image") as string || ""}
                    onChange={(e) => handleOverridesChange("background", "image", e.target.value || undefined)}
                  />
                </div>
                {getOverrideValue("background", "image") && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Position</Label>
                        <Select
                          value={getOverrideValue("background", "imagePosition") as string || "center"}
                          onValueChange={(v) => handleOverridesChange("background", "imagePosition", v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="top">Top</SelectItem>
                            <SelectItem value="bottom">Bottom</SelectItem>
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Size</Label>
                        <Select
                          value={getOverrideValue("background", "imageSize") as string || "cover"}
                          onValueChange={(v) => handleOverridesChange("background", "imageSize", v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cover">Cover</SelectItem>
                            <SelectItem value="contain">Contain</SelectItem>
                            <SelectItem value="auto">Auto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Overlay</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          className="h-8 w-12 p-1"
                          value={getOverrideValue("background", "overlay")?.color || "#000000"}
                          onChange={(e) => {
                            const current = getOverrideValue("background", "overlay") || {}
                            handleOverridesChange("background", "overlay", { ...current, color: e.target.value })
                          }}
                        />
                        <div className="flex-1">
                          <Slider
                            value={[getOverrideValue("background", "overlay")?.opacity ?? 0]}
                            onValueChange={([v]) => {
                              const current = getOverrideValue("background", "overlay") || {}
                              handleOverridesChange("background", "overlay", { ...current, opacity: v })
                            }}
                            min={0}
                            max={100}
                            step={5}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8">
                          {getOverrideValue("background", "overlay")?.opacity ?? 0}%
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </StyleSection>

            {/* Border & Shadow */}
            <StyleSection title="Border & Shadow" icon={<Box className="h-4 w-4" />}>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Width</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="0"
                      value={getOverrideValue("border", "width") as string || ""}
                      onChange={(e) => handleOverridesChange("border", "width", e.target.value || undefined)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Style</Label>
                    <Select
                      value={getOverrideValue("border", "style") as string || ""}
                      onValueChange={(v) => handleOverridesChange("border", "style", v || undefined)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        <SelectItem value="solid">Solid</SelectItem>
                        <SelectItem value="dashed">Dashed</SelectItem>
                        <SelectItem value="dotted">Dotted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Color</Label>
                    <Input
                      type="color"
                      className="h-8 w-full p-1"
                      value={getOverrideValue("border", "color") as string || "#000000"}
                      onChange={(e) => handleOverridesChange("border", "color", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Border Radius</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="e.g. 8px, 0.5rem, 50%"
                    value={getOverrideValue("border", "radius") as string || ""}
                    onChange={(e) => handleOverridesChange("border", "radius", e.target.value || undefined)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Shadow</Label>
                  <Select
                    value={getOverrideValue("shadow", "preset") as string || ""}
                    onValueChange={(v) => handleOverridesChange("shadow", "preset", v || undefined)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      <SelectItem value="sm">Small</SelectItem>
                      <SelectItem value="md">Medium</SelectItem>
                      <SelectItem value="lg">Large</SelectItem>
                      <SelectItem value="xl">Extra Large</SelectItem>
                      <SelectItem value="2xl">2XL</SelectItem>
                      <SelectItem value="inner">Inner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Custom Shadow</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="e.g. 0 4px 6px rgba(0,0,0,0.1)"
                    value={getOverrideValue("shadow", "custom") as string || ""}
                    onChange={(e) => handleOverridesChange("shadow", "custom", e.target.value || undefined)}
                  />
                </div>
              </div>
            </StyleSection>

            {/* Animation */}
            <StyleSection title="Animation" icon={<Sparkles className="h-4 w-4" />}>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Entrance Animation</Label>
                  <Select
                    value={getOverrideValue("animation", "entrance") as string || ""}
                    onValueChange={(v) => handleOverridesChange("animation", "entrance", v || undefined)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      <SelectItem value="fade">Fade In</SelectItem>
                      <SelectItem value="slide-up">Slide Up</SelectItem>
                      <SelectItem value="slide-down">Slide Down</SelectItem>
                      <SelectItem value="slide-left">Slide Left</SelectItem>
                      <SelectItem value="slide-right">Slide Right</SelectItem>
                      <SelectItem value="scale">Scale</SelectItem>
                      <SelectItem value="bounce">Bounce</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Duration</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="e.g. 0.3s"
                      value={getOverrideValue("animation", "duration") as string || ""}
                      onChange={(e) => handleOverridesChange("animation", "duration", e.target.value || undefined)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Delay</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="e.g. 0.1s"
                      value={getOverrideValue("animation", "delay") as string || ""}
                      onChange={(e) => handleOverridesChange("animation", "delay", e.target.value || undefined)}
                    />
                  </div>
                </div>
              </div>
            </StyleSection>
          </div>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="flex-1 overflow-y-auto p-4 space-y-4">
          <StyleSection title="Layout" icon={<Layers className="h-4 w-4" />} defaultOpen>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Display</Label>
                <Select
                  value={getOverrideValue("layout", "display") as string || ""}
                  onValueChange={(v) => handleOverridesChange("layout", "display", v || undefined)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Default</SelectItem>
                    <SelectItem value="block">Block</SelectItem>
                    <SelectItem value="flex">Flex</SelectItem>
                    <SelectItem value="grid">Grid</SelectItem>
                    <SelectItem value="inline">Inline</SelectItem>
                    <SelectItem value="none">Hidden</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {getOverrideValue("layout", "display") === "flex" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Direction</Label>
                    <Select
                      value={getOverrideValue("layout", "flexDirection") as string || "row"}
                      onValueChange={(v) => handleOverridesChange("layout", "flexDirection", v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="row">Row</SelectItem>
                        <SelectItem value="column">Column</SelectItem>
                        <SelectItem value="row-reverse">Row Reverse</SelectItem>
                        <SelectItem value="column-reverse">Column Reverse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Justify</Label>
                      <Select
                        value={getOverrideValue("layout", "justifyContent") as string || "start"}
                        onValueChange={(v) => handleOverridesChange("layout", "justifyContent", v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="start">Start</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="end">End</SelectItem>
                          <SelectItem value="between">Space Between</SelectItem>
                          <SelectItem value="around">Space Around</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Align</Label>
                      <Select
                        value={getOverrideValue("layout", "alignItems") as string || "stretch"}
                        onValueChange={(v) => handleOverridesChange("layout", "alignItems", v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="start">Start</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="end">End</SelectItem>
                          <SelectItem value="stretch">Stretch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
              {getOverrideValue("layout", "display") === "grid" && (
                <div className="space-y-1">
                  <Label className="text-xs">Grid Columns</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="e.g. 3, repeat(3, 1fr)"
                    value={getOverrideValue("layout", "gridColumns") as string || ""}
                    onChange={(e) => handleOverridesChange("layout", "gridColumns", e.target.value || undefined)}
                  />
                </div>
              )}
            </div>
          </StyleSection>

          <StyleSection title="Size" icon={<Box className="h-4 w-4" />}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Width</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="auto"
                    value={getOverrideValue("size", "width") as string || ""}
                    onChange={(e) => handleOverridesChange("size", "width", e.target.value || undefined)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Height</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="auto"
                    value={getOverrideValue("size", "height") as string || ""}
                    onChange={(e) => handleOverridesChange("size", "height", e.target.value || undefined)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Min Width</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="0"
                    value={getOverrideValue("size", "minWidth") as string || ""}
                    onChange={(e) => handleOverridesChange("size", "minWidth", e.target.value || undefined)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max Width</Label>
                  <Select
                    value={getOverrideValue("size", "maxWidth") as string || ""}
                    onValueChange={(v) => handleOverridesChange("size", "maxWidth", v || undefined)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      <SelectItem value="640px">SM (640px)</SelectItem>
                      <SelectItem value="768px">MD (768px)</SelectItem>
                      <SelectItem value="1024px">LG (1024px)</SelectItem>
                      <SelectItem value="1280px">XL (1280px)</SelectItem>
                      <SelectItem value="100%">Full</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Aspect Ratio</Label>
                <Select
                  value={getOverrideValue("size", "aspectRatio") as string || ""}
                  onValueChange={(v) => handleOverridesChange("size", "aspectRatio", v || undefined)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Auto</SelectItem>
                    <SelectItem value="1/1">Square (1:1)</SelectItem>
                    <SelectItem value="16/9">Video (16:9)</SelectItem>
                    <SelectItem value="4/3">Photo (4:3)</SelectItem>
                    <SelectItem value="21/9">Ultrawide (21:9)</SelectItem>
                    <SelectItem value="3/2">Classic (3:2)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </StyleSection>

          <StyleSection title="Visibility" icon={<Sparkles className="h-4 w-4" />}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Hide on Mobile</Label>
                <Switch
                  checked={settings.hideOnMobile || false}
                  onCheckedChange={(v) => handleSettingsChange(["hideOnMobile"], v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Hide on Desktop</Label>
                <Switch
                  checked={settings.hideOnDesktop || false}
                  onCheckedChange={(v) => handleSettingsChange(["hideOnDesktop"], v)}
                />
              </div>
            </div>
          </StyleSection>

          <StyleSection title="Accessibility" icon={<Settings className="h-4 w-4" />}>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">ARIA Label</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder="Descriptive label for screen readers"
                  value={settings.ariaLabel || ""}
                  onChange={(e) => handleSettingsChange(["ariaLabel"], e.target.value || undefined)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Role</Label>
                <Select
                  value={settings.role || ""}
                  onValueChange={(v) => handleSettingsChange(["role"], v || undefined)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Default</SelectItem>
                    <SelectItem value="region">Region</SelectItem>
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="navigation">Navigation</SelectItem>
                    <SelectItem value="main">Main</SelectItem>
                    <SelectItem value="complementary">Complementary</SelectItem>
                    <SelectItem value="contentinfo">Content Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </StyleSection>
        </TabsContent>

        {/* Custom CSS Tab */}
        <TabsContent value="code" className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-600 dark:text-amber-400">
              <strong>Custom CSS</strong> - Write CSS that applies only to this block. Use <code>.block</code> to target the container.
            </div>
            <div className="space-y-2">
              <Label className="text-xs">CSS Code</Label>
              <Textarea
                className="font-mono text-xs min-h-[300px]"
                placeholder={`.block {
  /* Your custom styles here */
}

.block:hover {
  /* Hover styles */
}

@media (max-width: 768px) {
  .block {
    /* Mobile styles */
  }
}`}
                value={settings.customCSS || ""}
                onChange={(e) => handleSettingsChange(["customCSS"], e.target.value || undefined)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Custom Classes</Label>
              <Input
                className="h-8 text-xs font-mono"
                placeholder="e.g. my-custom-class another-class"
                value={settings.customClasses || ""}
                onChange={(e) => handleSettingsChange(["customClasses"], e.target.value || undefined)}
              />
              <p className="text-[10px] text-muted-foreground">
                Add Tailwind or custom CSS classes separated by spaces
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================
// HELPER COMPONENTS
// ============================================

function StyleSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded text-sm font-medium">
        <div className="flex items-center gap-2">
          {icon}
          {title}
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 pb-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

function ColorInput({
  label,
  value,
  onChange,
  brandColors,
}: {
  label: string
  value?: string
  onChange: (value: string | undefined) => void
  brandColors?: {
    primaryColor?: string | null
    secondaryColor?: string | null
    accentColor?: string | null
    backgroundColor?: string | null
    textColor?: string | null
  } | null
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-1">
        <Input
          type="color"
          className="h-8 w-10 p-1 shrink-0"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
        />
        <Input
          className="h-8 text-xs flex-1 font-mono"
          placeholder="transparent"
          value={value || ""}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      </div>
      {brandColors && (
        <div className="flex gap-1 mt-1">
          {brandColors.primaryColor && (
            <button
              type="button"
              className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform"
              style={{ backgroundColor: brandColors.primaryColor }}
              onClick={() => onChange(brandColors.primaryColor ?? undefined)}
              title="Primary"
            />
          )}
          {brandColors.secondaryColor && (
            <button
              type="button"
              className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform"
              style={{ backgroundColor: brandColors.secondaryColor }}
              onClick={() => onChange(brandColors.secondaryColor ?? undefined)}
              title="Secondary"
            />
          )}
          {brandColors.accentColor && (
            <button
              type="button"
              className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform"
              style={{ backgroundColor: brandColors.accentColor }}
              onClick={() => onChange(brandColors.accentColor ?? undefined)}
              title="Accent"
            />
          )}
          <button
            type="button"
            className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform bg-transparent flex items-center justify-center text-[8px]"
            onClick={() => onChange(undefined)}
            title="Clear"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================
// CONTENT EDITORS FOR EACH BLOCK TYPE
// ============================================

function ContentEditor({
  blockType,
  content,
  onChange,
}: {
  blockType: string
  content: BlockContent
  onChange: (key: string, value: unknown) => void
}) {
  switch (blockType) {
    case "hero":
      return <HeroContentEditor content={content as HeroBlockContent} onChange={onChange} />
    case "text":
      return <TextContentEditor content={content as TextBlockContent} onChange={onChange} />
    case "heading":
      return <HeadingContentEditor content={content as HeadingBlockContent} onChange={onChange} />
    case "image":
      return <ImageContentEditor content={content as ImageBlockContent} onChange={onChange} />
    case "gallery":
      return <GalleryContentEditor content={content as GalleryBlockContent} onChange={onChange} />
    case "video":
      return <VideoContentEditor content={content as VideoBlockContent} onChange={onChange} />
    case "spacer":
      return <SpacerContentEditor content={content as SpacerBlockContent} onChange={onChange} />
    case "divider":
      return <DividerContentEditor content={content as DividerBlockContent} onChange={onChange} />
    case "cta":
      return <CTAContentEditor content={content as CTABlockContent} onChange={onChange} />
    case "artist-bio":
      return <ArtistBioContentEditor content={content as ArtistBioBlockContent} onChange={onChange} />
    case "music-links":
      return <MusicLinksContentEditor content={content as MusicLinksBlockContent} onChange={onChange} />
    case "social-links":
      return <SocialLinksContentEditor content={content as SocialLinksBlockContent} onChange={onChange} />
    case "tour-dates":
      return <TourDatesContentEditor content={content as TourDatesBlockContent} onChange={onChange} />
    case "music-player":
      return <MusicPlayerContentEditor content={content as MusicPlayerBlockContent} onChange={onChange} />
    case "events-list":
      return <EventsListContentEditor content={content as EventsListBlockContent} onChange={onChange} />
    case "event-card":
      return <EventCardContentEditor content={content as EventCardBlockContent} onChange={onChange} />
    case "countdown":
      return <CountdownContentEditor content={content as CountdownBlockContent} onChange={onChange} />
    case "products-grid":
      return <ProductsGridContentEditor content={content as ProductsGridBlockContent} onChange={onChange} />
    case "product-card":
      return <ProductCardContentEditor content={content as ProductCardBlockContent} onChange={onChange} />
    case "featured-products":
      return <FeaturedProductsContentEditor content={content as FeaturedProductsBlockContent} onChange={onChange} />
    case "contact-form":
      return <ContactFormContentEditor content={content as ContactFormBlockContent} onChange={onChange} />
    case "newsletter":
      return <NewsletterContentEditor content={content as NewsletterBlockContent} onChange={onChange} />
    case "map":
      return <MapContentEditor content={content as MapBlockContent} onChange={onChange} />
    case "faq":
      return <FAQContentEditor content={content as FAQBlockContent} onChange={onChange} />
    case "testimonials":
      return <TestimonialsContentEditor content={content as TestimonialsBlockContent} onChange={onChange} />
    case "html":
      return <HTMLContentEditor content={content as HTMLBlockContent} onChange={onChange} />
    default:
      return <GenericContentEditor content={content} onChange={onChange} />
  }
}

// Hero Content Editor
function HeroContentEditor({ content, onChange }: { content: HeroBlockContent; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={content.title || ""} onChange={(e) => onChange("title", e.target.value)} placeholder="Hero title" />
      </div>
      <div className="space-y-2">
        <Label>Subtitle</Label>
        <Textarea value={content.subtitle || ""} onChange={(e) => onChange("subtitle", e.target.value)} placeholder="Hero subtitle" rows={2} />
      </div>
      <div className="space-y-2">
        <Label>Background Image URL</Label>
        <Input value={content.backgroundImage || ""} onChange={(e) => onChange("backgroundImage", e.target.value)} placeholder="https://..." />
      </div>
      <div className="space-y-2">
        <Label>Background Video URL</Label>
        <Input value={content.backgroundVideo || ""} onChange={(e) => onChange("backgroundVideo", e.target.value)} placeholder="https://..." />
      </div>
      <div className="flex items-center justify-between">
        <Label>Dark Overlay</Label>
        <Switch checked={content.overlay || false} onCheckedChange={(v) => onChange("overlay", v)} />
      </div>
      {content.overlay && (
        <div className="space-y-2">
          <Label>Overlay Opacity ({content.overlayOpacity || 50}%)</Label>
          <Slider value={[content.overlayOpacity || 50]} onValueChange={([v]) => onChange("overlayOpacity", v)} min={0} max={100} step={5} />
        </div>
      )}
      <div className="space-y-2">
        <Label>CTA Button Text</Label>
        <Input value={content.ctaText || ""} onChange={(e) => onChange("ctaText", e.target.value)} placeholder="Learn More" />
      </div>
      <div className="space-y-2">
        <Label>CTA Button Link</Label>
        <Input value={content.ctaLink || ""} onChange={(e) => onChange("ctaLink", e.target.value)} placeholder="/about" />
      </div>
      <div className="space-y-2">
        <Label>Alignment</Label>
        <Select value={content.alignment || "center"} onValueChange={(v) => onChange("alignment", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
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

// Text Content Editor
function TextContentEditor({ content, onChange }: { content: TextBlockContent; onChange: (key: string, value: unknown) => void }) {
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
        <p className="text-xs text-muted-foreground">Rich text editor coming soon.</p>
      </div>
      <div className="space-y-2">
        <Label>Alignment</Label>
        <Select value={content.alignment || "left"} onValueChange={(v) => onChange("alignment", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
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

// Heading Content Editor
function HeadingContentEditor({ content, onChange }: { content: HeadingBlockContent; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Text</Label>
        <Input value={content.text || ""} onChange={(e) => onChange("text", e.target.value)} placeholder="Section Title" />
      </div>
      <div className="space-y-2">
        <Label>Heading Level</Label>
        <Select value={content.level || "h2"} onValueChange={(v) => onChange("level", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
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
        <Select value={content.alignment || "left"} onValueChange={(v) => onChange("alignment", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
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

// Image Content Editor
function ImageContentEditor({ content, onChange }: { content: ImageBlockContent; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Image URL</Label>
        <Input value={content.url || ""} onChange={(e) => onChange("url", e.target.value)} placeholder="https://..." />
      </div>
      <div className="space-y-2">
        <Label>Alt Text</Label>
        <Input value={content.alt || ""} onChange={(e) => onChange("alt", e.target.value)} placeholder="Description of the image" />
      </div>
      <div className="space-y-2">
        <Label>Caption</Label>
        <Input value={content.caption || ""} onChange={(e) => onChange("caption", e.target.value)} placeholder="Optional caption" />
      </div>
      <div className="space-y-2">
        <Label>Link</Label>
        <Input value={content.link || ""} onChange={(e) => onChange("link", e.target.value)} placeholder="https://..." />
      </div>
      <div className="space-y-2">
        <Label>Size</Label>
        <Select value={content.size || "large"} onValueChange={(v) => onChange("size", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
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

// Gallery Content Editor
function GalleryContentEditor({ content, onChange }: { content: GalleryBlockContent; onChange: (key: string, value: unknown) => void }) {
  const images = content.images || []

  const addImage = () => {
    onChange("images", [...images, { url: "", alt: "" }])
  }

  const updateImage = (index: number, field: string, value: string) => {
    const newImages = [...images]
    newImages[index] = { ...newImages[index], [field]: value }
    onChange("images", newImages)
  }

  const removeImage = (index: number) => {
    onChange("images", images.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Layout</Label>
        <Select value={content.layout || "grid"} onValueChange={(v) => onChange("layout", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="grid">Grid</SelectItem>
            <SelectItem value="masonry">Masonry</SelectItem>
            <SelectItem value="slider">Slider</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Columns</Label>
        <Select value={String(content.columns || 3)} onValueChange={(v) => onChange("columns", parseInt(v))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 Columns</SelectItem>
            <SelectItem value="3">3 Columns</SelectItem>
            <SelectItem value="4">4 Columns</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Images ({images.length})</Label>
          <Button type="button" variant="outline" size="sm" onClick={addImage}>Add Image</Button>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {images.map((img, i) => (
            <div key={i} className="flex gap-2 p-2 border rounded">
              <div className="flex-1 space-y-1">
                <Input className="h-7 text-xs" placeholder="Image URL" value={img.url} onChange={(e) => updateImage(i, "url", e.target.value)} />
                <Input className="h-7 text-xs" placeholder="Alt text" value={img.alt || ""} onChange={(e) => updateImage(i, "alt", e.target.value)} />
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeImage(i)}>✕</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Video Content Editor
function VideoContentEditor({ content, onChange }: { content: VideoBlockContent; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Video URL</Label>
        <Input value={content.url || ""} onChange={(e) => onChange("url", e.target.value)} placeholder="YouTube, Vimeo, or direct URL" />
      </div>
      <div className="flex items-center justify-between">
        <Label>Autoplay</Label>
        <Switch checked={content.autoplay || false} onCheckedChange={(v) => onChange("autoplay", v)} />
      </div>
      <div className="flex items-center justify-between">
        <Label>Muted</Label>
        <Switch checked={content.muted || false} onCheckedChange={(v) => onChange("muted", v)} />
      </div>
      <div className="flex items-center justify-between">
        <Label>Loop</Label>
        <Switch checked={content.loop || false} onCheckedChange={(v) => onChange("loop", v)} />
      </div>
    </div>
  )
}

// Spacer Content Editor
function SpacerContentEditor({ content, onChange }: { content: SpacerBlockContent; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Height ({content.height || 64}px)</Label>
        <Slider value={[content.height || 64]} onValueChange={([v]) => onChange("height", v)} min={16} max={256} step={8} />
      </div>
    </div>
  )
}

// Divider Content Editor
function DividerContentEditor({ content, onChange }: { content: DividerBlockContent; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Style</Label>
        <Select value={content.style || "solid"} onValueChange={(v) => onChange("style", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="dashed">Dashed</SelectItem>
            <SelectItem value="dotted">Dotted</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Width</Label>
        <Select value={content.width || "full"} onValueChange={(v) => onChange("width", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
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

// CTA Content Editor
function CTAContentEditor({ content, onChange }: { content: CTABlockContent; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Button Text</Label>
        <Input value={content.text || ""} onChange={(e) => onChange("text", e.target.value)} placeholder="Learn More" />
      </div>
      <div className="space-y-2">
        <Label>Link</Label>
        <Input value={content.link || ""} onChange={(e) => onChange("link", e.target.value)} placeholder="/about or https://..." />
      </div>
      <div className="space-y-2">
        <Label>Style</Label>
        <Select value={content.style || "primary"} onValueChange={(v) => onChange("style", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
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
        <Select value={content.size || "md"} onValueChange={(v) => onChange("size", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Small</SelectItem>
            <SelectItem value="md">Medium</SelectItem>
            <SelectItem value="lg">Large</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Alignment</Label>
        <Select value={content.alignment || "center"} onValueChange={(v) => onChange("alignment", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
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

// Artist Bio Content Editor
function ArtistBioContentEditor({ content, onChange }: { content: ArtistBioBlockContent; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Artist Name</Label>
        <Input value={content.name || ""} onChange={(e) => onChange("name", e.target.value)} placeholder="Artist name" />
      </div>
      <div className="space-y-2">
        <Label>Genres (comma-separated)</Label>
        <Input value={(content.genres || []).join(", ")} onChange={(e) => onChange("genres", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} placeholder="Electronic, House, Techno" />
      </div>
      <div className="space-y-2">
        <Label>Bio</Label>
        <Textarea value={content.bio || ""} onChange={(e) => onChange("bio", e.target.value)} placeholder="Artist biography..." rows={4} />
      </div>
      <div className="space-y-2">
        <Label>Image URL</Label>
        <Input value={content.image || ""} onChange={(e) => onChange("image", e.target.value)} placeholder="https://..." />
      </div>
    </div>
  )
}

// Music Links Content Editor
function MusicLinksContentEditor({ content, onChange }: { content: MusicLinksBlockContent; onChange: (key: string, value: unknown) => void }) {
  const platforms = content.platforms || []

  const addPlatform = () => {
    onChange("platforms", [...platforms, { name: "", url: "" }])
  }

  const updatePlatform = (index: number, field: string, value: string) => {
    const newPlatforms = [...platforms]
    newPlatforms[index] = { ...newPlatforms[index], [field]: value }
    onChange("platforms", newPlatforms)
  }

  const removePlatform = (index: number) => {
    onChange("platforms", platforms.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Style</Label>
        <Select value={content.style || "icons"} onValueChange={(v) => onChange("style", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="icons">Icons Only</SelectItem>
            <SelectItem value="buttons">Buttons</SelectItem>
            <SelectItem value="list">List</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Platforms ({platforms.length})</Label>
          <Button type="button" variant="outline" size="sm" onClick={addPlatform}>Add Platform</Button>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {platforms.map((platform, i) => (
            <div key={i} className="flex gap-2 p-2 border rounded">
              <div className="flex-1 space-y-1">
                <Select value={platform.name} onValueChange={(v) => updatePlatform(i, "name", v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Platform" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Spotify">Spotify</SelectItem>
                    <SelectItem value="Apple Music">Apple Music</SelectItem>
                    <SelectItem value="SoundCloud">SoundCloud</SelectItem>
                    <SelectItem value="YouTube Music">YouTube Music</SelectItem>
                    <SelectItem value="Bandcamp">Bandcamp</SelectItem>
                    <SelectItem value="Tidal">Tidal</SelectItem>
                    <SelectItem value="Deezer">Deezer</SelectItem>
                  </SelectContent>
                </Select>
                <Input className="h-7 text-xs" placeholder="URL" value={platform.url} onChange={(e) => updatePlatform(i, "url", e.target.value)} />
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => removePlatform(i)}>✕</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Social Links Content Editor
function SocialLinksContentEditor({ content, onChange }: { content: SocialLinksBlockContent; onChange: (key: string, value: unknown) => void }) {
  const platforms = content.platforms || []

  const addPlatform = () => {
    onChange("platforms", [...platforms, { name: "", url: "" }])
  }

  const updatePlatform = (index: number, field: string, value: string) => {
    const newPlatforms = [...platforms]
    newPlatforms[index] = { ...newPlatforms[index], [field]: value }
    onChange("platforms", newPlatforms)
  }

  const removePlatform = (index: number) => {
    onChange("platforms", platforms.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Style</Label>
        <Select value={content.style || "icons"} onValueChange={(v) => onChange("style", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="icons">Icons Only</SelectItem>
            <SelectItem value="buttons">Buttons</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Platforms ({platforms.length})</Label>
          <Button type="button" variant="outline" size="sm" onClick={addPlatform}>Add</Button>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {platforms.map((platform, i) => (
            <div key={i} className="flex gap-2 p-2 border rounded">
              <div className="flex-1 space-y-1">
                <Select value={platform.name} onValueChange={(v) => updatePlatform(i, "name", v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Platform" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="TikTok">TikTok</SelectItem>
                    <SelectItem value="Twitter">Twitter/X</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="YouTube">YouTube</SelectItem>
                    <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                    <SelectItem value="Discord">Discord</SelectItem>
                    <SelectItem value="Twitch">Twitch</SelectItem>
                  </SelectContent>
                </Select>
                <Input className="h-7 text-xs" placeholder="URL" value={platform.url} onChange={(e) => updatePlatform(i, "url", e.target.value)} />
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => removePlatform(i)}>✕</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Tour Dates Content Editor
function TourDatesContentEditor({ content, onChange }: { content: TourDatesBlockContent; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Show Past Events</Label>
        <Switch checked={content.showPast || false} onCheckedChange={(v) => onChange("showPast", v)} />
      </div>
      <div className="space-y-2">
        <Label>Limit</Label>
        <Select value={String(content.limit || 10)} onValueChange={(v) => onChange("limit", parseInt(v))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5 events</SelectItem>
            <SelectItem value="10">10 events</SelectItem>
            <SelectItem value="20">20 events</SelectItem>
            <SelectItem value="0">All events</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">Events will be pulled from your Events module automatically.</p>
    </div>
  )
}

// Music Player Content Editor
function MusicPlayerContentEditor({ content, onChange }: { content: MusicPlayerBlockContent; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Platform</Label>
        <Select value={content.platform || "spotify"} onValueChange={(v) => onChange("platform", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="spotify">Spotify</SelectItem>
            <SelectItem value="soundcloud">SoundCloud</SelectItem>
            <SelectItem value="apple">Apple Music</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Embed ID</Label>
        <Input value={content.embedId || ""} onChange={(e) => onChange("embedId", e.target.value)} placeholder="Track, album, or playlist ID" />
      </div>
      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={content.type || "track"} onValueChange={(v) => onChange("type", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="track">Single Track</SelectItem>
            <SelectItem value="album">Album</SelectItem>
            <SelectItem value="playlist">Playlist</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// Events List Content Editor
function EventsListContentEditor({ content, onChange }: { content: EventsListBlockContent; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Filter</Label>
        <Select value={content.filter || "upcoming"} onValueChange={(v) => onChange("filter", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="upcoming">Upcoming Only</SelectItem>
            <SelectItem value="past">Past Only</SelectItem>
            <SelectItem value="all">All Events</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Layout</Label>
        <Select value={content.layout || "list"} onValueChange={(v) => onChange("layout", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="list">List</SelectItem>
            <SelectItem value="grid">Grid</SelectItem>
            <SelectItem value="cards">Cards</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Limit</Label>
        <Select value={String(content.limit || 10)} onValueChange={(v) => onChange("limit", parseInt(v))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5 events</SelectItem>
            <SelectItem value="10">10 events</SelectItem>
            <SelectItem value="20">20 events</SelectItem>
            <SelectItem value="0">All events</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// Event Card Content Editor
function EventCardContentEditor({ content, onChange }: { content: EventCardBlockContent; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Event ID</Label>
        <Input value={content.eventId || ""} onChange={(e) => onChange("eventId", e.target.value)} placeholder="Select from your events" />
        <p className="text-xs text-muted-foreground">Event picker coming soon. Enter event ID manually.</p>
      </div>
      <div className="space-y-2">
        <Label>Style</Label>
        <Select value={content.style || "full"} onValueChange={(v) => onChange("style", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="full">Full</SelectItem>
            <SelectItem value="compact">Compact</SelectItem>
            <SelectItem value="minimal">Minimal</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// Countdown Content Editor
function CountdownContentEditor({ content, onChange }: { content: CountdownBlockContent; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={content.title || ""} onChange={(e) => onChange("title", e.target.value)} placeholder="Coming Soon..." />
      </div>
      <div className="space-y-2">
        <Label>Target Date</Label>
        <Input type="datetime-local" value={content.targetDate || ""} onChange={(e) => onChange("targetDate", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Or Link to Event</Label>
        <Input value={content.eventId || ""} onChange={(e) => onChange("eventId", e.target.value)} placeholder="Event ID (optional)" />
      </div>
    </div>
  )
}

// Products Grid Content Editor
function ProductsGridContentEditor({ content, onChange }: { content: ProductsGridBlockContent; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Category ID (optional)</Label>
        <Input value={content.categoryId || ""} onChange={(e) => onChange("categoryId", e.target.value)} placeholder="Filter by category" />
      </div>
      <div className="space-y-2">
        <Label>Columns</Label>
        <Select value={String(content.columns || 3)} onValueChange={(v) => onChange("columns", parseInt(v))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 Columns</SelectItem>
            <SelectItem value="3">3 Columns</SelectItem>
            <SelectItem value="4">4 Columns</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Limit</Label>
        <Select value={String(content.limit || 12)} onValueChange={(v) => onChange("limit", parseInt(v))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="6">6 products</SelectItem>
            <SelectItem value="12">12 products</SelectItem>
            <SelectItem value="24">24 products</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// Product Card Content Editor
function ProductCardContentEditor({ content, onChange }: { content: ProductCardBlockContent; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Product ID</Label>
        <Input value={content.productId || ""} onChange={(e) => onChange("productId", e.target.value)} placeholder="Select from inventory" />
        <p className="text-xs text-muted-foreground">Product picker coming soon. Enter product ID manually.</p>
      </div>
      <div className="space-y-2">
        <Label>Style</Label>
        <Select value={content.style || "full"} onValueChange={(v) => onChange("style", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="full">Full</SelectItem>
            <SelectItem value="compact">Compact</SelectItem>
            <SelectItem value="minimal">Minimal</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// Featured Products Content Editor
function FeaturedProductsContentEditor({ content, onChange }: { content: FeaturedProductsBlockContent; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Product IDs (comma-separated)</Label>
        <Textarea value={(content.productIds || []).join(", ")} onChange={(e) => onChange("productIds", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} placeholder="Enter product IDs" rows={3} />
      </div>
      <div className="space-y-2">
        <Label>Layout</Label>
        <Select value={content.layout || "grid"} onValueChange={(v) => onChange("layout", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="grid">Grid</SelectItem>
            <SelectItem value="slider">Slider</SelectItem>
            <SelectItem value="list">List</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// Contact Form Content Editor
function ContactFormContentEditor({ content, onChange }: { content: ContactFormBlockContent; onChange: (key: string, value: unknown) => void }) {
  const fields = content.fields || []

  const addField = () => {
    onChange("fields", [...fields, { name: "", type: "text", required: false }])
  }

  const updateField = (index: number, key: string, value: unknown) => {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], [key]: value }
    onChange("fields", newFields)
  }

  const removeField = (index: number) => {
    onChange("fields", fields.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Recipient Email</Label>
        <Input value={content.recipientEmail || ""} onChange={(e) => onChange("recipientEmail", e.target.value)} placeholder="contact@example.com" />
      </div>
      <div className="space-y-2">
        <Label>Submit Button Text</Label>
        <Input value={content.submitText || ""} onChange={(e) => onChange("submitText", e.target.value)} placeholder="Send Message" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Form Fields ({fields.length})</Label>
          <Button type="button" variant="outline" size="sm" onClick={addField}>Add Field</Button>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {fields.map((field, i) => (
            <div key={i} className="p-2 border rounded space-y-2">
              <div className="flex gap-2">
                <Input className="h-7 text-xs flex-1" placeholder="Field name" value={field.name} onChange={(e) => updateField(i, "name", e.target.value)} />
                <Select value={field.type} onValueChange={(v) => updateField(i, "type", v)}>
                  <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="textarea">Textarea</SelectItem>
                    <SelectItem value="select">Select</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => removeField(i)}>✕</Button>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={field.required || false} onCheckedChange={(v) => updateField(i, "required", v)} />
                <Label className="text-xs">Required</Label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Newsletter Content Editor
function NewsletterContentEditor({ content, onChange }: { content: NewsletterBlockContent; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={content.title || ""} onChange={(e) => onChange("title", e.target.value)} placeholder="Subscribe to our newsletter" />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={content.description || ""} onChange={(e) => onChange("description", e.target.value)} placeholder="Stay updated with our latest news" rows={2} />
      </div>
      <div className="space-y-2">
        <Label>Provider</Label>
        <Select value={content.provider || "custom"} onValueChange={(v) => onChange("provider", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">Custom / Manual</SelectItem>
            <SelectItem value="mailchimp">Mailchimp</SelectItem>
            <SelectItem value="convertkit">ConvertKit</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {content.provider !== "custom" && (
        <div className="space-y-2">
          <Label>List ID</Label>
          <Input value={content.listId || ""} onChange={(e) => onChange("listId", e.target.value)} placeholder="Your list ID" />
        </div>
      )}
    </div>
  )
}

// Map Content Editor
function MapContentEditor({ content, onChange }: { content: MapBlockContent; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Address</Label>
        <Input value={content.address || ""} onChange={(e) => onChange("address", e.target.value)} placeholder="123 Main St, City, Country" />
      </div>
      <div className="space-y-2">
        <Label>Zoom Level</Label>
        <Slider value={[content.zoom || 14]} onValueChange={([v]) => onChange("zoom", v)} min={1} max={20} step={1} />
      </div>
      <div className="space-y-2">
        <Label>Style</Label>
        <Select value={content.style || "standard"} onValueChange={(v) => onChange("style", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="light">Light</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// FAQ Content Editor
function FAQContentEditor({ content, onChange }: { content: FAQBlockContent; onChange: (key: string, value: unknown) => void }) {
  const items = content.items || []

  const addItem = () => {
    onChange("items", [...items, { question: "", answer: "" }])
  }

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    onChange("items", newItems)
  }

  const removeItem = (index: number) => {
    onChange("items", items.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>FAQ Items ({items.length})</Label>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>Add Question</Button>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {items.map((item, i) => (
          <div key={i} className="p-2 border rounded space-y-2">
            <div className="flex gap-2">
              <Input className="flex-1" placeholder="Question" value={item.question} onChange={(e) => updateItem(i, "question", e.target.value)} />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)}>✕</Button>
            </div>
            <Textarea placeholder="Answer" value={item.answer} onChange={(e) => updateItem(i, "answer", e.target.value)} rows={2} />
          </div>
        ))}
      </div>
    </div>
  )
}

// Testimonials Content Editor
function TestimonialsContentEditor({ content, onChange }: { content: TestimonialsBlockContent; onChange: (key: string, value: unknown) => void }) {
  const items = content.items || []

  const addItem = () => {
    onChange("items", [...items, { quote: "", author: "", role: "" }])
  }

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    onChange("items", newItems)
  }

  const removeItem = (index: number) => {
    onChange("items", items.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Layout</Label>
        <Select value={content.layout || "grid"} onValueChange={(v) => onChange("layout", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="grid">Grid</SelectItem>
            <SelectItem value="slider">Slider</SelectItem>
            <SelectItem value="list">List</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between">
        <Label>Testimonials ({items.length})</Label>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>Add</Button>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {items.map((item, i) => (
          <div key={i} className="p-2 border rounded space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs">#{i + 1}</Label>
              <Button type="button" variant="ghost" size="sm" className="h-5 px-1" onClick={() => removeItem(i)}>✕</Button>
            </div>
            <Textarea placeholder="Quote" value={item.quote} onChange={(e) => updateItem(i, "quote", e.target.value)} rows={2} />
            <div className="grid grid-cols-2 gap-2">
              <Input className="h-7 text-xs" placeholder="Author name" value={item.author} onChange={(e) => updateItem(i, "author", e.target.value)} />
              <Input className="h-7 text-xs" placeholder="Role/title" value={item.role || ""} onChange={(e) => updateItem(i, "role", e.target.value)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// HTML Content Editor
function HTMLContentEditor({ content, onChange }: { content: HTMLBlockContent; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-600 dark:text-amber-400">
        <strong>Warning:</strong> Custom HTML can break your page layout or introduce security vulnerabilities. Use with caution.
      </div>
      <div className="space-y-2">
        <Label>HTML Code</Label>
        <Textarea
          className="font-mono text-xs min-h-[200px]"
          placeholder="<div>Your custom HTML here</div>"
          value={content.code || ""}
          onChange={(e) => onChange("code", e.target.value)}
        />
      </div>
    </div>
  )
}

// Generic Content Editor (fallback)
function GenericContentEditor({ content, onChange }: { content: BlockContent; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Raw JSON editor for this block type.</p>
      <Textarea
        value={JSON.stringify(content, null, 2)}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value)
            Object.entries(parsed).forEach(([key, value]) => onChange(key, value))
          } catch {
            // Invalid JSON
          }
        }}
        rows={10}
        className="font-mono text-xs"
      />
    </div>
  )
}
