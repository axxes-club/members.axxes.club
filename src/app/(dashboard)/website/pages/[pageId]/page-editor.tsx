"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Save,
  Settings,
  Loader2,
  ExternalLink,
} from "lucide-react"
import { EditorCanvas } from "./editor-canvas"
import { EditorSidebar } from "./editor-sidebar"
import { updatePage, publishPage, unpublishPage } from "@/lib/actions/pages"
import type { Page, PageBlock, BlockType, BlockContent, BlockSettings } from "@/lib/db/schema"

interface PageEditorProps {
  page: Page & { blocks: PageBlock[] }
}

export function PageEditor({ page: initialPage }: PageEditorProps) {
  const router = useRouter()
  const [page, setPage] = useState(initialPage)
  const [blocks, setBlocks] = useState<PageBlock[]>(initialPage.blocks)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const selectedBlock = selectedBlockId
    ? blocks.find((b) => b.id === selectedBlockId) ?? null
    : null

  const handleTitleChange = useCallback((title: string) => {
    setPage((prev) => ({ ...prev, title }))
    setHasUnsavedChanges(true)
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updatePage(page.id, { title: page.title })
      setHasUnsavedChanges(false)
      router.refresh()
    } catch (error) {
      console.error("Failed to save:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublishToggle = async () => {
    setIsPublishing(true)
    try {
      if (page.isPublished) {
        await unpublishPage(page.id)
        setPage((prev) => ({ ...prev, isPublished: false }))
      } else {
        await publishPage(page.id)
        setPage((prev) => ({ ...prev, isPublished: true, publishedAt: new Date() }))
      }
      router.refresh()
    } catch (error) {
      console.error("Failed to toggle publish:", error)
    } finally {
      setIsPublishing(false)
    }
  }

  const handleBlockSelect = useCallback((blockId: string | null) => {
    setSelectedBlockId(blockId)
  }, [])

  const handleBlocksUpdate = useCallback((newBlocks: PageBlock[]) => {
    setBlocks(newBlocks)
    setHasUnsavedChanges(true)
  }, [])

  const handleBlockAdd = useCallback((newBlock: PageBlock) => {
    setBlocks((prev) => [...prev, newBlock])
    setSelectedBlockId(newBlock.id)
    setHasUnsavedChanges(true)
  }, [])

  const handleBlockUpdate = useCallback((blockId: string, updates: Partial<PageBlock>) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId ? { ...block, ...updates } : block
      )
    )
    setHasUnsavedChanges(true)
  }, [])

  const handleBlockDelete = useCallback((blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId))
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null)
    }
    setHasUnsavedChanges(true)
  }, [selectedBlockId])

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col -m-6 lg:-m-8">
      {/* Editor Header */}
      <header className="flex h-14 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-4">
          <Link href="/website/pages">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Input
              value={page.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="h-8 w-48 font-medium"
            />
            <Badge variant={page.isPublished ? "success" : "secondary"}>
              {page.isPublished ? "Published" : "Draft"}
            </Badge>
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-amber-500">
                Unsaved changes
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
          <Button
            variant={page.isPublished ? "outline" : "default"}
            size="sm"
            onClick={handlePublishToggle}
            disabled={isPublishing}
          >
            {isPublishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : page.isPublished ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {page.isPublished ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </header>

      {/* Editor Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 overflow-y-auto bg-muted/30 p-8">
          <EditorCanvas
            pageId={page.id}
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            onBlockSelect={handleBlockSelect}
            onBlocksUpdate={handleBlocksUpdate}
            onBlockAdd={handleBlockAdd}
            onBlockDelete={handleBlockDelete}
          />
        </div>

        {/* Sidebar */}
        <EditorSidebar
          pageId={page.id}
          selectedBlock={selectedBlock}
          onBlockAdd={handleBlockAdd}
          onBlockUpdate={handleBlockUpdate}
          onBlockDeselect={() => setSelectedBlockId(null)}
        />
      </div>
    </div>
  )
}
