"use client"

import * as React from "react"

export type ZoomLevel = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2

export const ZOOM_LEVELS: ZoomLevel[] = [0.5, 0.75, 1, 1.25, 1.5, 2]

export const ZOOM_LABELS: Record<ZoomLevel, string> = {
  0.5: "50%",
  0.75: "75%",
  1: "100%",
  1.25: "125%",
  1.5: "150%",
  2: "200%",
}

interface EditorZoomContextValue {
  zoomLevel: ZoomLevel
  setZoomLevel: (level: ZoomLevel) => void
  zoomIn: () => void
  zoomOut: () => void
  fitToScreen: () => void
  canZoomIn: boolean
  canZoomOut: boolean
  scrollPosition: { x: number; y: number }
  setScrollPosition: (pos: { x: number; y: number }) => void
  viewportSize: { width: number; height: number }
  setViewportSize: (size: { width: number; height: number }) => void
  contentSize: { width: number; height: number }
  setContentSize: (size: { width: number; height: number }) => void
  canvasContainerRef: React.RefObject<HTMLDivElement | null>
}

const EditorZoomContext = React.createContext<EditorZoomContextValue | null>(null)

interface EditorZoomProviderProps {
  children: React.ReactNode
}

export function EditorZoomProvider({ children }: EditorZoomProviderProps) {
  const [zoomLevel, setZoomLevelState] = React.useState<ZoomLevel>(1)
  const [scrollPosition, setScrollPosition] = React.useState({ x: 0, y: 0 })
  const [viewportSize, setViewportSize] = React.useState({ width: 0, height: 0 })
  const [contentSize, setContentSize] = React.useState({ width: 0, height: 0 })
  const canvasContainerRef = React.useRef<HTMLDivElement>(null)

  const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel)
  const canZoomIn = currentIndex < ZOOM_LEVELS.length - 1
  const canZoomOut = currentIndex > 0

  const setZoomLevel = React.useCallback((level: ZoomLevel) => {
    setZoomLevelState(level)
  }, [])

  const zoomIn = React.useCallback(() => {
    if (canZoomIn) {
      setZoomLevelState(ZOOM_LEVELS[currentIndex + 1])
    }
  }, [canZoomIn, currentIndex])

  const zoomOut = React.useCallback(() => {
    if (canZoomOut) {
      setZoomLevelState(ZOOM_LEVELS[currentIndex - 1])
    }
  }, [canZoomOut, currentIndex])

  const fitToScreen = React.useCallback(() => {
    if (viewportSize.width && contentSize.width) {
      const widthRatio = viewportSize.width / contentSize.width
      const heightRatio = viewportSize.height / contentSize.height
      const optimalRatio = Math.min(widthRatio, heightRatio, 1) * 0.9

      // Find closest zoom level
      const closest = ZOOM_LEVELS.reduce((prev, curr) =>
        Math.abs(curr - optimalRatio) < Math.abs(prev - optimalRatio) ? curr : prev
      )
      setZoomLevelState(closest)
    }
  }, [viewportSize, contentSize])

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "=" || e.key === "+")) {
        e.preventDefault()
        zoomIn()
      } else if ((e.metaKey || e.ctrlKey) && e.key === "-") {
        e.preventDefault()
        zoomOut()
      } else if ((e.metaKey || e.ctrlKey) && e.key === "0") {
        e.preventDefault()
        setZoomLevelState(1)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [zoomIn, zoomOut])

  const value = React.useMemo(
    () => ({
      zoomLevel,
      setZoomLevel,
      zoomIn,
      zoomOut,
      fitToScreen,
      canZoomIn,
      canZoomOut,
      scrollPosition,
      setScrollPosition,
      viewportSize,
      setViewportSize,
      contentSize,
      setContentSize,
      canvasContainerRef,
    }),
    [
      zoomLevel,
      setZoomLevel,
      zoomIn,
      zoomOut,
      fitToScreen,
      canZoomIn,
      canZoomOut,
      scrollPosition,
      viewportSize,
      contentSize,
    ]
  )

  return (
    <EditorZoomContext.Provider value={value}>
      {children}
    </EditorZoomContext.Provider>
  )
}

export function useEditorZoom() {
  const context = React.useContext(EditorZoomContext)
  if (!context) {
    throw new Error("useEditorZoom must be used within an EditorZoomProvider")
  }
  return context
}
