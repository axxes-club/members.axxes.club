"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Link as LinkIcon, Loader2 } from "lucide-react"
import { createAsset, fetchUrlMetadata } from "@/lib/actions/assets"

interface AddAssetDialogProps {
  folders: string[]
}

export function AddAssetDialog({ folders }: AddAssetDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [url, setUrl] = useState("")
  const [metadata, setMetadata] = useState<{
    mimeType?: string
    fileSize?: number
    category?: string
  }>({})

  async function handleUrlBlur() {
    if (!url || !url.startsWith("http")) return
    setFetching(true)
    const data = await fetchUrlMetadata(url)
    setMetadata(data)
    setFetching(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const tagsInput = formData.get("tags") as string
    const parsedTags = tagsInput
      ? tagsInput.split(",").map(s => s.trim()).filter(Boolean)
      : undefined

    await createAsset({
      name: formData.get("name") as string,
      url: formData.get("url") as string,
      description: formData.get("description") as string || undefined,
      altText: formData.get("altText") as string || undefined,
      folder: formData.get("folder") as string || undefined,
      tags: parsedTags,
      category: metadata.category || formData.get("category") as string || undefined,
      mimeType: metadata.mimeType,
      fileSize: metadata.fileSize,
      source: "url",
    })

    setLoading(false)
    setOpen(false)
    setUrl("")
    setMetadata({})
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add Asset
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Asset by URL</DialogTitle>
          <DialogDescription>
            Add an image, video, or document by providing its URL.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Asset URL *</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="url"
                name="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={handleUrlBlur}
                placeholder="https://example.com/image.jpg"
                className="pl-9"
                required
              />
              {fetching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {metadata.mimeType && (
              <p className="text-xs text-muted-foreground">
                Detected: {metadata.mimeType}
                {metadata.fileSize && ` (${(metadata.fileSize / 1024).toFixed(1)} KB)`}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              name="name"
              placeholder="My Image"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="folder">Folder</Label>
              <Select name="folder">
                <SelectTrigger>
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No folder</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder} value={folder}>
                      {folder}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select name="category" defaultValue={metadata.category}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="altText">Alt Text</Label>
            <Input
              id="altText"
              name="altText"
              placeholder="Descriptive alt text for accessibility"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              name="tags"
              placeholder="tag1, tag2, tag3"
            />
            <p className="text-xs text-muted-foreground">Separate tags with commas</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Optional description..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Asset"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
