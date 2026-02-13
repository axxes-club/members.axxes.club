"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Minus, Plus, Maximize, ChevronDown } from "lucide-react"
import { useEditorZoom, ZOOM_LEVELS, ZOOM_LABELS, type ZoomLevel } from "./editor-zoom-context"

export function EditorZoomControls() {
  const {
    zoomLevel,
    setZoomLevel,
    zoomIn,
    zoomOut,
    fitToScreen,
    canZoomIn,
    canZoomOut,
  } = useEditorZoom()

  return (
    <div className="flex items-center gap-1 border bg-background px-1 py-0.5">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={zoomOut}
        disabled={!canZoomOut}
        aria-label="Zoom out"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 min-w-[72px] px-2 font-mono text-xs">
            {ZOOM_LABELS[zoomLevel]}
            <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-[100px]">
          {ZOOM_LEVELS.map((level) => (
            <DropdownMenuItem
              key={level}
              onClick={() => setZoomLevel(level)}
              className="justify-center font-mono text-xs"
            >
              {ZOOM_LABELS[level]}
              {level === zoomLevel && (
                <span className="absolute right-2 text-club">●</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={zoomIn}
        disabled={!canZoomIn}
        aria-label="Zoom in"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>

      <div className="mx-1 h-4 w-px bg-border" />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={fitToScreen}
        aria-label="Fit to screen"
      >
        <Maximize className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
