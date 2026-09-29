"use client"

import * as React from "react"
import { format } from "date-fns"
import { ChevronLeft, ChevronRight, Copy, Download, ExternalLink, Loader2, Maximize2, Plus, Share2, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { updateDamAsset } from "@/lib/actions/dam"
import type { DamAsset } from "@/lib/dam/types"
import { appTarget } from "@/lib/dam/app-links"
import { AssetThumb, downloadAsset, formatBytes } from "./dam-utils"

interface DamDetailsProps {
  asset: DamAsset
  folders: string[]
  canWrite: boolean
  canDelete: boolean
  onClose: () => void
  onSaved: (asset: DamAsset) => void
  onPreview: () => void
  onShare: () => void
  onDelete: () => void
}

export function DamDetails({ asset, folders, canWrite, canDelete, onClose, onSaved, onPreview, onShare, onDelete }: DamDetailsProps) {
  const [name, setName] = React.useState(asset.name)
  const [folder, setFolder] = React.useState(asset.folder ?? "")
  const [tags, setTags] = React.useState(asset.tags)
  const [tagDraft, setTagDraft] = React.useState("")
  const [description, setDescription] = React.useState(asset.description ?? "")
  const [altText, setAltText] = React.useState(asset.altText ?? "")
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    setName(asset.name)
    setFolder(asset.folder ?? "")
    setTags(asset.tags)
    setTagDraft("")
    setDescription(asset.description ?? "")
    setAltText(asset.altText ?? "")
  }, [asset])

  const dirty =
    name !== asset.name ||
    folder !== (asset.folder ?? "") ||
    description !== (asset.description ?? "") ||
    altText !== (asset.altText ?? "") ||
    tags.join("\u0000") !== asset.tags.join("\u0000")

  const addTag = () => {
    const tag = tagDraft.trim().toLowerCase()
    if (tag && !tags.includes(tag)) setTags([...tags, tag])
    setTagDraft("")
  }

  const save = async () => {
    setSaving(true)
    try {
      onSaved(await updateDamAsset(asset.id, { name, folder: folder || null, tags, description, altText }))
      toast.success("Changes saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(asset.url)
    toast.success("File URL copied")
  }

  return (
    <aside
      className="flex w-80 shrink-0 flex-col border-l bg-background"
      onContextMenu={(e) => e.stopPropagation()}
      aria-label="Asset details"
    >
      <div className="flex h-12 items-center justify-between border-b px-4">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Details</span>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close details">
          <X />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <button
          type="button"
          onClick={onPreview}
          className="group relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-muted"
          aria-label="Open preview"
        >
          <AssetThumb asset={asset} className="object-contain" iconClassName="h-12 w-12" />
          <span className="absolute right-2 top-2 bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Maximize2 className="h-4 w-4" />
          </span>
        </button>

        <div className="grid grid-cols-4 border-b">
          <PanelAction label="Download" onClick={() => downloadAsset(asset)}><Download /></PanelAction>
          <PanelAction label="Copy URL" onClick={copyLink}><Copy /></PanelAction>
          <PanelAction label="Share" onClick={onShare} disabled={!canWrite}><Share2 /></PanelAction>
          <PanelAction label="Open" onClick={() => window.open(asset.url, "_blank", "noopener,noreferrer")}><ExternalLink /></PanelAction>
        </div>

        <div className="space-y-5 p-4">
          <Field label="Name">
            {canWrite ? (
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            ) : (
              <p className="break-words text-[13px] font-medium">{asset.name}</p>
            )}
          </Field>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
            <Meta label="Type">{asset.mimeType ?? asset.type}</Meta>
            <Meta label="Size">{formatBytes(asset.size)}</Meta>
            {asset.width && asset.height ? <Meta label="Dimensions">{asset.width} × {asset.height}</Meta> : null}
            <Meta label="Added">{format(new Date(asset.createdAt), "MMM d, yyyy")}</Meta>
            <Meta label="Source" className="capitalize">{asset.source ?? "—"}</Meta>
          </dl>

          <Field label="Folder">
            {canWrite ? (
              <>
                <Input list="dam-folder-options" placeholder="Unfiled" value={folder} onChange={(e) => setFolder(e.target.value)} />
                <datalist id="dam-folder-options">
                  {folders.map((f) => <option key={f} value={f} />)}
                </datalist>
              </>
            ) : (
              <p className="text-[13px]">{asset.folder ?? "Unfiled"}</p>
            )}
          </Field>

          <Field label="Tags">
            <div className="flex flex-wrap gap-1.5">
              {tags.length === 0 && !canWrite && <span className="text-[13px] text-muted-foreground">No tags</span>}
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 bg-secondary px-2 py-0.5 text-xs">
                  {tag}
                  {canWrite && (
                    <button type="button" aria-label={`Remove tag ${tag}`} onClick={() => setTags(tags.filter((t) => t !== tag))}>
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            {canWrite && (
              <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); addTag() }}>
                <Input placeholder="Add a tag" value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} className="h-8" />
                <Button type="submit" variant="outline" size="icon-sm" className="h-8 w-8" disabled={!tagDraft.trim()} aria-label="Add tag">
                  <Plus />
                </Button>
              </form>
            )}
          </Field>

          {(canWrite || asset.description) && (
            <Field label="Description">
              {canWrite ? (
                <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              ) : (
                <p className="whitespace-pre-wrap text-[13px]">{asset.description}</p>
              )}
            </Field>
          )}

          {asset.type === "image" && (canWrite || asset.altText) && (
            <Field label="Alt text">
              {canWrite ? (
                <Input placeholder="Describe the image" value={altText} onChange={(e) => setAltText(e.target.value)} />
              ) : (
                <p className="text-[13px]">{asset.altText}</p>
              )}
            </Field>
          )}
        </div>
      </div>

      {(canWrite || canDelete) && (
        <div className="space-y-2 border-t p-4">
          {canWrite && (
            <Button className="w-full" disabled={!dirty || saving || !name.trim()} onClick={save}>
              {saving && <Loader2 className="animate-spin" />}
              {saving ? "Saving…" : "Save changes"}
            </Button>
          )}
          {canDelete && (
            <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 /> Delete
            </Button>
          )}
        </div>
      )}
    </aside>
  )
}

function PanelAction({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="flex flex-col items-center gap-1 border-r py-3 text-[11px] text-muted-foreground last:border-r-0 hover:bg-accent hover:text-foreground disabled:opacity-40 [&_svg]:size-4"
    >
      {children}
      {label}
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

function Meta({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`truncate font-medium ${className ?? ""}`}>{children}</dd>
    </div>
  )
}

// ── Full-screen preview with prev/next ───────────────────────────────────

export function DamPreview({
  assets,
  index,
  onIndexChange,
  onClose,
  tenantId,
}: {
  assets: DamAsset[]
  index: number | null
  onIndexChange: (index: number) => void
  onClose: () => void
  tenantId?: string
}) {
  const asset = index != null ? assets[index] : null
  // A file that an app can show read-only can be shown in place, so a folder
  // does not have to be left to read a file it already holds. Office is the one
  // that has a QuickLook today; the registry decides, not this component.
  const previewable = (asset?.appLinks ?? [])
    .map((l) => ({ link: l, target: appTarget(l.appKey) }))
    .find((x) => x.target?.quickLook)
  const [inline, setInline] = React.useState(false)

  React.useEffect(() => {
    // Never carry "show the document" over to the next file in the set.
    setInline(false)
  }, [asset?.id])

  React.useEffect(() => {
    if (index == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && index < assets.length - 1) onIndexChange(index + 1)
      if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [index, assets.length, onIndexChange])

  return (
    <Dialog open={asset != null} onOpenChange={(o) => !o && onClose()}>
      {asset && (
        <DialogContent className="flex h-[90vh] max-w-[95vw] flex-col gap-0 p-0 sm:max-w-[95vw]" onContextMenu={(e) => e.stopPropagation()}>
          <div className="flex h-12 shrink-0 items-center gap-3 border-b px-4 pr-12">
            <DialogTitle className="truncate text-[13px] font-medium">{asset.name}</DialogTitle>
            <span className="text-xs text-muted-foreground">{index! + 1} / {assets.length}</span>
            {previewable && (
              <Button
                variant={inline ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setInline((v) => !v)}
              >
                {inline ? "Show the file" : `Read in ${previewable.target!.name}`}
              </Button>
            )}
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => downloadAsset(asset)}>
              <Download /> Download
            </Button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center bg-muted/40">
            {inline && previewable ? (
              <iframe
                key={previewable.link.recordId}
                src={previewable.target!.quickLook!(previewable.link.recordId, tenantId)}
                title={`${asset.name} — ${previewable.target!.name}`}
                className="h-full w-full border-0 bg-background"
              />
            ) : asset.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.url} alt={asset.altText ?? asset.name} className="max-h-full max-w-full object-contain" />
            ) : asset.type === "video" ? (
              <video key={asset.id} src={asset.url} controls autoPlay className="max-h-full max-w-full" />
            ) : asset.mimeType === "application/pdf" ? (
              <iframe src={asset.url} title={asset.name} className="h-full w-full bg-white" />
            ) : asset.mimeType?.startsWith("audio/") ? (
              <audio key={asset.id} src={asset.url} controls autoPlay />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="h-32 w-32"><AssetThumb asset={asset} iconClassName="h-16 w-16" /></div>
                <p className="text-[13px] text-muted-foreground">No preview available for this file type.</p>
                <Button onClick={() => downloadAsset(asset)}><Download /> Download</Button>
              </div>
            )}
            {index! > 0 && (
              <Button variant="secondary" size="icon" className="absolute left-4" onClick={() => onIndexChange(index! - 1)} aria-label="Previous">
                <ChevronLeft />
              </Button>
            )}
            {index! < assets.length - 1 && (
              <Button variant="secondary" size="icon" className="absolute right-4" onClick={() => onIndexChange(index! + 1)} aria-label="Next">
                <ChevronRight />
              </Button>
            )}
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}
