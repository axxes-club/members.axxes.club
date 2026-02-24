"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Puck } from "@puckeditor/core"
import "@puckeditor/core/puck.css"
import { puckConfig } from "@/lib/puck/config"
import { pageToPuckData } from "@/lib/puck/adapter"
import { savePuckData, loadPuckData } from "@/lib/puck/actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Save,
  Loader2,
  ExternalLink,
} from "lucide-react"
import { publishPage, unpublishPage } from "@/lib/actions/pages"
import type { Data } from "@puckeditor/core"
import type { Page, PageBlock } from "@/lib/db/schema"

interface PuckEditorClientProps {
  pageId: string
}

export function PuckEditorClient({ pageId }: PuckEditorClientProps) {
  const router = useRouter()
  const [page, setPage] = useState<(Page & { blocks: PageBlock[] }) | null>(null)
  const [data, setData] = useState<Data | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load page data
  useEffect(() => {
    async function loadPage() {
      try {
        const pageData = await loadPuckData(pageId)
        setPage(pageData)
        setData(pageToPuckData(pageData))
      } catch (err) {
        console.error("Failed to load page:", err)
        setError("Failed to load page")
      } finally {
        setIsLoading(false)
      }
    }
    loadPage()
  }, [pageId])

  // Handle save
  const handleSave = useCallback(async (newData: Data) => {
    setIsSaving(true)
    try {
      await savePuckData(pageId, newData)
      setHasUnsavedChanges(false)
      // Update local page state with new title if changed
      if (newData.root?.props?.title) {
        setPage(prev => prev ? { ...prev, title: newData.root!.props!.title as string } : prev)
      }
    } catch (err) {
      console.error("Failed to save:", err)
      setError("Failed to save changes")
    } finally {
      setIsSaving(false)
    }
  }, [pageId])

  // Handle publish toggle
  const handlePublishToggle = useCallback(async () => {
    if (!page) return
    
    setIsPublishing(true)
    try {
      if (page.isPublished) {
        await unpublishPage(page.id)
        setPage(prev => prev ? { ...prev, isPublished: false } : prev)
      } else {
        await publishPage(page.id)
        setPage(prev => prev ? { ...prev, isPublished: true, publishedAt: new Date() } : prev)
      }
      router.refresh()
    } catch (err) {
      console.error("Failed to toggle publish:", err)
      setError("Failed to update publish status")
    } finally {
      setIsPublishing(false)
    }
  }, [page, router])

  // Track unsaved changes
  const handleDataChange = useCallback((newData: Data) => {
    setData(newData)
    setHasUnsavedChanges(true)
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !page || !data) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error || "Page not found"}</p>
        <Link href="/website/pages">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pages
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col -m-6 lg:-m-8">
      {/* Editor Header */}
      <header className="flex h-14 items-center justify-between border-b bg-background px-4 z-50">
        <div className="flex items-center gap-4">
          <Link href="/website/pages">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-medium">{page.title}</span>
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
          {/* Preview link */}
          {page.isPublished && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/p/${page.slug}`} target="_blank">
                <ExternalLink className="h-4 w-4 mr-1" />
                View
              </Link>
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => data && handleSave(data)}
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

      {/* Puck Editor */}
      <div className="flex-1 overflow-hidden">
        <Puck
          config={puckConfig}
          data={data}
          onChange={handleDataChange}
          onPublish={handleSave}
        />
      </div>
    </div>
  )
}