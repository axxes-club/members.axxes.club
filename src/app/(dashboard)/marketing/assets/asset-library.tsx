"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  Grid,
  List,
  MoreHorizontal,
  Copy,
  Trash2,
  ExternalLink,
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
} from "lucide-react"
import { deleteAsset } from "@/lib/actions/assets"
import type { Asset } from "@/lib/db/schema"

interface AssetLibraryProps {
  assets: Asset[]
  folders: string[]
  tags?: string[]
  filters: {
    search?: string
    category?: string
    folder?: string
  }
}

function getCategoryIcon(category: string | null) {
  switch (category) {
    case "image":
      return FileImage
    case "video":
      return FileVideo
    case "audio":
      return FileAudio
    case "document":
      return FileText
    default:
      return FileImage
  }
}

export function AssetLibrary({ assets, folders, filters }: AssetLibraryProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [search, setSearch] = useState(filters.search || "")

  function updateFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "all") {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/marketing/assets?${params.toString()}`)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    updateFilter("search", search || undefined)
  }

  async function handleCopyUrl(url: string) {
    await navigator.clipboard.writeText(url)
  }

  async function handleDelete(assetId: string) {
    if (!confirm("Are you sure you want to delete this asset?")) return
    await deleteAsset(assetId)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets..."
              className="pl-9"
            />
          </div>
        </form>

        <Select
          value={filters.category || "all"}
          onValueChange={(v) => updateFilter("category", v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.folder || "all"}
          onValueChange={(v) => updateFilter("folder", v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Folder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Folders</SelectItem>
            {folders.map((folder) => (
              <SelectItem key={folder} value={folder}>
                {folder}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex border rounded-md">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Asset Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {assets.map((asset) => {
            const Icon = getCategoryIcon(asset.category)
            const isImage = asset.category === "image"

            return (
              <Card key={asset.id} className="group overflow-hidden">
                <div className="relative aspect-video bg-muted">
                  {isImage ? (
                    <Image
                      src={asset.url}
                      alt={asset.altText || asset.name}
                      className="object-cover"
                      fill
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Icon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="icon-sm"
                      variant="secondary"
                      onClick={() => handleCopyUrl(asset.url)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="secondary"
                      asChild
                    >
                      <a href={asset.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="destructive"
                      onClick={() => handleDelete(asset.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="font-medium text-sm truncate">{asset.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {asset.category || "unknown"}
                    </Badge>
                    {asset.folder && (
                      <span className="text-xs text-muted-foreground truncate">
                        {asset.folder}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {assets.map((asset) => {
            const Icon = getCategoryIcon(asset.category)
            const isImage = asset.category === "image"

            return (
              <Card key={asset.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="h-16 w-16 flex-shrink-0 rounded-md bg-muted overflow-hidden">
                    {isImage ? (
                      <Image
                        src={asset.url}
                        alt={asset.altText || asset.name}
                        className="object-cover"
                        fill
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Icon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{asset.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {asset.category || "unknown"}
                      </Badge>
                      {asset.folder && (
                        <span className="text-xs text-muted-foreground">
                          {asset.folder}
                        </span>
                      )}
                      {asset.tags && (asset.tags as string[]).length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {(asset.tags as string[]).slice(0, 2).join(", ")}
                          {(asset.tags as string[]).length > 2 && "..."}
                        </span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleCopyUrl(asset.url)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy URL
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={asset.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open in New Tab
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(asset.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {assets.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">No assets match your filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
