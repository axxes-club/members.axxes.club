"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useEditorZoom } from "./editor-zoom-context"
import type { PageBlock } from "@/lib/db/schema"

interface EditorMinimapProps {
  blocks: PageBlock[]
  className?: string
}

const MINIMAP_WIDTH = 160
const MINIMAP_MAX_HEIGHT = 200
const BLOCK_HEIGHT_SCALE = 0.1 // Scale factor for block heights

// Color mapping for block types
const BLOCK_COLORS: Record<string, string> = {
  hero: "bg-primary",
  text: "bg-muted-foreground/30",
  image: "bg-blue-500/50",
  gallery: "bg-blue-400/40",
  cta: "bg-club/50",
  features: "bg-emerald-500/40",
  testimonials: "bg-amber-500/40",
  pricing: "bg-violet-500/40",
  contact: "bg-rose-500/40",
  divider: "bg-border",
  spacer: "bg-transparent border border-dashed border-muted-foreground/20",
}

// Estimated heights for different block types (in pixels at 100% zoom)
const BLOCK_HEIGHTS: Record<string, number> = {
  hero: 400,
  text: 150,
  image: 250,
  gallery: 300,
  cta: 200,
  features: 350,
  testimonials: 280,
  pricing: 400,
  contact: 300,
  divider: 20,
  spacer: 60,
}

export function EditorMinimap({ blocks, className }: EditorMinimapProps) {
  const {
    zoomLevel,
    scrollPosition,
    viewportSize,
    contentSize,
    canvasContainerRef,
  } = useEditorZoom()

  const [isDragging, setIsDragging] = React.useState(false)
  const minimapRef = React.useRef<HTMLDivElement>(null)

  // Calculate minimap dimensions
  const totalContentHeight = blocks.reduce(
    (sum, block) => sum + (BLOCK_HEIGHTS[block.type] || 150),
    0
  )
  const minimapContentHeight = totalContentHeight * BLOCK_HEIGHT_SCALE
  const minimapHeight = Math.min(minimapContentHeight + 20, MINIMAP_MAX_HEIGHT)
  const scale = minimapContentHeight > 0 ? Math.min(MINIMAP_MAX_HEIGHT / minimapContentHeight, 1) : 1

  // Calculate viewport rectangle position and size
  const viewportRectHeight = viewportSize.height > 0 && contentSize.height > 0
    ? (viewportSize.height / (contentSize.height * zoomLevel)) * minimapContentHeight * scale
    : minimapContentHeight * scale
  const viewportRectTop = contentSize.height > 0
    ? (scrollPosition.y / (contentSize.height * zoomLevel)) * minimapContentHeight * scale
    : 0

  const handleMinimapClick = (e: React.MouseEvent) => {
    const container = canvasContainerRef.current
    const minimap = minimapRef.current
    if (!container || !minimap) return

    const rect = minimap.getBoundingClientRect()
    const clickY = e.clientY - rect.top
    const scrollRatio = clickY / (minimapContentHeight * scale)
    const targetScroll = scrollRatio * contentSize.height * zoomLevel - viewportSize.height / 2

    container.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: "smooth",
    })
  }

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragMove = React.useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return

      const container = canvasContainerRef.current
      const minimap = minimapRef.current
      if (!container || !minimap) return

      const rect = minimap.getBoundingClientRect()
      const mouseY = e.clientY - rect.top
      const scrollRatio = mouseY / (minimapContentHeight * scale)
      const targetScroll = scrollRatio * contentSize.height * zoomLevel - viewportSize.height / 2

      container.scrollTop = Math.max(0, targetScroll)
    },
    [isDragging, canvasContainerRef, minimapContentHeight, scale, contentSize.height, zoomLevel, viewportSize.height]
  )

  const handleDragEnd = React.useCallback(() => {
    setIsDragging(false)
  }, [])

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove)
      window.addEventListener("mouseup", handleDragEnd)
      return () => {
        window.removeEventListener("mousemove", handleDragMove)
        window.removeEventListener("mouseup", handleDragEnd)
      }
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  if (blocks.length === 0) return null

  return (
    <div
      ref={minimapRef}
      className={cn(
        "absolute bottom-4 right-4 z-10 border bg-background/95 backdrop-blur-sm shadow-lg",
        "cursor-pointer select-none",
        className
      )}
      style={{
        width: MINIMAP_WIDTH,
        height: minimapHeight,
      }}
      onClick={handleMinimapClick}
    >
      {/* Minimap Header */}
      <div className="flex items-center justify-between border-b px-2 py-1">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Overview
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          {blocks.length}
        </span>
      </div>

      {/* Block Previews */}
      <div className="relative p-2" style={{ height: minimapContentHeight * scale }}>
        {blocks.map((block, index) => {
          const blockHeight = (BLOCK_HEIGHTS[block.type] || 150) * BLOCK_HEIGHT_SCALE * scale
          const previousHeight = blocks
            .slice(0, index)
            .reduce((sum, b) => sum + (BLOCK_HEIGHTS[b.type] || 150) * BLOCK_HEIGHT_SCALE * scale, 0)

          return (
            <div
              key={block.id}
              className={cn(
                "absolute left-2 right-2 transition-opacity",
                BLOCK_COLORS[block.type] || "bg-muted",
                !block.isVisible && "opacity-30"
              )}
              style={{
                top: previousHeight,
                height: Math.max(blockHeight - 2, 2),
              }}
            />
          )
        })}

        {/* Viewport Rectangle */}
        <div
          className={cn(
            "absolute left-0 right-0 border-2 border-club bg-club/10 transition-all",
            isDragging && "border-club"
          )}
          style={{
            top: Math.max(0, viewportRectTop),
            height: Math.min(viewportRectHeight, minimapContentHeight * scale - viewportRectTop),
          }}
          onMouseDown={handleDragStart}
        />
      </div>
    </div>
  )
}
