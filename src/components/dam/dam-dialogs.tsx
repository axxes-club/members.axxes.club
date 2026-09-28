"use client"

import * as React from "react"
import { Check, Copy, Folder, FolderPlus, Inbox, Link2, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  addDamTags,
  createDamAssetFromUrl,
  createDamShareLink,
  deleteDamAssets,
  deleteDamFolder,
  moveDamAssets,
  renameDamFolder,
  updateDamAsset,
} from "@/lib/actions/dam"
import type { DamAsset } from "@/lib/dam/types"

export type ShareTarget = { kind: "asset"; id: string; name: string } | { kind: "folder"; folder: string }

export type DamDialogState =
  | { kind: "rename"; asset: DamAsset }
  | { kind: "move"; ids: string[] }
  | { kind: "tags"; ids: string[] }
  | { kind: "delete"; ids: string[]; label: string }
  | { kind: "share"; target: ShareTarget }
  | { kind: "add-url"; folder: string | null }
  | { kind: "new-folder"; moveIds?: string[] }
  | { kind: "rename-folder"; folder: string }
  | { kind: "delete-folder"; folder: string; count: number }
  | null

interface DamDialogsProps {
  state: DamDialogState
  onClose: () => void
  folders: string[]
  tagSuggestions: string[]
  canDelete: boolean
  onAssetUpdated: (asset: DamAsset) => void
  onAssetCreated: (asset: DamAsset) => void
  onAssetsMoved: (ids: string[], folder: string | null) => void
  onAssetsDeleted: (ids: string[]) => void
  onChanged: () => void
  onFolderCreated: (name: string, saved: boolean) => void
  onFolderRenamed: (from: string, to: string) => void
  onFolderDeleted: (name: string) => void
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong"
}

export function DamDialogs(props: DamDialogsProps) {
  const { state, onClose } = props
  const open = state !== null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {state && (
        <DialogContent className="sm:max-w-md" onContextMenu={(e) => e.stopPropagation()}>
          {state.kind === "rename" && <RenameAsset {...props} asset={state.asset} />}
          {state.kind === "move" && <MoveAssets {...props} ids={state.ids} />}
          {state.kind === "tags" && <TagAssets {...props} ids={state.ids} />}
          {state.kind === "delete" && <DeleteAssets {...props} ids={state.ids} label={state.label} />}
          {state.kind === "share" && <ShareLink target={state.target} />}
          {state.kind === "add-url" && <AddFromUrl {...props} folder={state.folder} />}
          {state.kind === "new-folder" && <NewFolder {...props} moveIds={state.moveIds} />}
          {state.kind === "rename-folder" && <RenameFolder {...props} folder={state.folder} />}
          {state.kind === "delete-folder" && <DeleteFolder {...props} folder={state.folder} count={state.count} />}
        </DialogContent>
      )}
    </Dialog>
  )
}

function useSubmit() {
  const [pending, setPending] = React.useState(false)
  const run = async (fn: () => Promise<void>) => {
    setPending(true)
    try {
      await fn()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPending(false)
    }
  }
  return { pending, run }
}

function SubmitButton({ pending, children, disabled, variant }: {
  pending: boolean
  children: React.ReactNode
  disabled?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <Button type="submit" variant={variant} disabled={pending || disabled}>
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  )
}

// ── Assets ───────────────────────────────────────────────────────────────

function RenameAsset({ asset, onClose, onAssetUpdated }: DamDialogsProps & { asset: DamAsset }) {
  const [name, setName] = React.useState(asset.name)
  const { pending, run } = useSubmit()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(async () => {
          onAssetUpdated(await updateDamAsset(asset.id, { name }))
          toast.success("Renamed")
          onClose()
        })
      }}
    >
      <DialogHeader>
        <DialogTitle>Rename</DialogTitle>
      </DialogHeader>
      <div className="py-4">
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} onFocus={(e) => e.target.select()} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <SubmitButton pending={pending} disabled={!name.trim() || name === asset.name}>Rename</SubmitButton>
      </DialogFooter>
    </form>
  )
}

function MoveAssets({ ids, folders, onClose, onAssetsMoved }: DamDialogsProps & { ids: string[] }) {
  const [target, setTarget] = React.useState<string | null>(null)
  const [newName, setNewName] = React.useState("")
  const [mode, setMode] = React.useState<"pick" | "new">(folders.length ? "pick" : "new")
  const { pending, run } = useSubmit()
  const destination = mode === "new" ? newName.trim() || null : target

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (mode === "new" && !newName.trim()) return
        run(async () => {
          const moved = await moveDamAssets(ids, destination)
          onAssetsMoved(ids, destination)
          toast.success(`Moved ${moved} item${moved === 1 ? "" : "s"} to ${destination ?? "Unfiled"}`)
          onClose()
        })
      }}
    >
      <DialogHeader>
        <DialogTitle>Move {ids.length} item{ids.length === 1 ? "" : "s"}</DialogTitle>
        <DialogDescription>Choose a destination folder.</DialogDescription>
      </DialogHeader>
      <div className="max-h-72 overflow-y-auto border my-4">
        <FolderOption active={mode === "pick" && target === null} onClick={() => { setMode("pick"); setTarget(null) }}>
          <Inbox /> Unfiled
        </FolderOption>
        {folders.map((f) => (
          <FolderOption key={f} active={mode === "pick" && target === f} onClick={() => { setMode("pick"); setTarget(f) }}>
            <Folder /> <span className="truncate">{f}</span>
          </FolderOption>
        ))}
        <FolderOption active={mode === "new"} onClick={() => setMode("new")}>
          <FolderPlus /> New folder…
        </FolderOption>
      </div>
      {mode === "new" && (
        <Input autoFocus placeholder="New folder name" value={newName} onChange={(e) => setNewName(e.target.value)} className="mb-4" />
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <SubmitButton pending={pending} disabled={mode === "new" && !newName.trim()}>Move</SubmitButton>
      </DialogFooter>
    </form>
  )
}

function FolderOption({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-accent [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        active && "bg-accent font-medium"
      )}
    >
      {children}
      {active && <Check className="ml-auto !text-foreground" />}
    </button>
  )
}

function TagAssets({ ids, tagSuggestions, onClose, onChanged }: DamDialogsProps & { ids: string[] }) {
  const [tags, setTags] = React.useState<string[]>([])
  const [draft, setDraft] = React.useState("")
  const { pending, run } = useSubmit()

  const add = (value: string) => {
    const tag = value.trim().toLowerCase()
    if (tag && !tags.includes(tag)) setTags([...tags, tag])
    setDraft("")
  }
  const suggestions = tagSuggestions.filter((t) => !tags.includes(t) && t.includes(draft.trim().toLowerCase())).slice(0, 12)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (draft.trim()) return add(draft)
        run(async () => {
          const n = await addDamTags(ids, tags)
          toast.success(`Tagged ${n} item${n === 1 ? "" : "s"}`)
          onChanged()
          onClose()
        })
      }}
    >
      <DialogHeader>
        <DialogTitle>Add tags</DialogTitle>
        <DialogDescription>
          Tags are added to {ids.length} item{ids.length === 1 ? "" : "s"}. Existing tags are kept.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-4">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 bg-secondary px-2 py-0.5 text-xs">
                {t}
                <button type="button" aria-label={`Remove ${t}`} onClick={() => setTags(tags.filter((x) => x !== t))}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <Input autoFocus placeholder="Type a tag and press Enter" value={draft} onChange={(e) => setDraft(e.target.value)} />
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((t) => (
              <button key={t} type="button" onClick={() => add(t)} className="border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent">
                + {t}
              </button>
            ))}
          </div>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <SubmitButton pending={pending} disabled={!tags.length}>Add tags</SubmitButton>
      </DialogFooter>
    </form>
  )
}

function DeleteAssets({ ids, label, onClose, onAssetsDeleted }: DamDialogsProps & { ids: string[]; label: string }) {
  const { pending, run } = useSubmit()
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(async () => {
          const n = await deleteDamAssets(ids)
          onAssetsDeleted(ids)
          toast.success(`Deleted ${n} item${n === 1 ? "" : "s"}`)
          onClose()
        })
      }}
    >
      <DialogHeader>
        <DialogTitle>Delete {label}?</DialogTitle>
        <DialogDescription>
          This permanently removes {ids.length === 1 ? "it" : "them"} from the library. Files uploaded here are deleted from
          storage too. This can&apos;t be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <SubmitButton pending={pending} variant="destructive">Delete</SubmitButton>
      </DialogFooter>
    </form>
  )
}

function AddFromUrl({ folder, onClose, onAssetCreated }: DamDialogsProps & { folder: string | null }) {
  const [url, setUrl] = React.useState("")
  const [name, setName] = React.useState("")
  const { pending, run } = useSubmit()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(async () => {
          onAssetCreated(await createDamAssetFromUrl({ url, name, folder }))
          toast.success("Asset added")
          onClose()
        })
      }}
    >
      <DialogHeader>
        <DialogTitle>Add from URL</DialogTitle>
        <DialogDescription>
          Link an image, video or document hosted elsewhere{folder ? ` into “${folder}”` : ""}. The file stays where it is.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="dam-url">URL</Label>
          <Input id="dam-url" autoFocus type="url" required placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dam-url-name">Name <span className="text-muted-foreground">(optional)</span></Label>
          <Input id="dam-url-name" placeholder="Defaults to the file name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <SubmitButton pending={pending} disabled={!url.trim()}>Add</SubmitButton>
      </DialogFooter>
    </form>
  )
}

// ── Folders ──────────────────────────────────────────────────────────────

function NewFolder({ moveIds, folders, onClose, onFolderCreated, onAssetsMoved }: DamDialogsProps & { moveIds?: string[] }) {
  const [name, setName] = React.useState("")
  const { pending, run } = useSubmit()
  const clean = name.trim().replace(/\s+/g, " ")
  const exists = folders.includes(clean)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(async () => {
          if (moveIds?.length) {
            await moveDamAssets(moveIds, clean)
            onAssetsMoved(moveIds, clean)
            toast.success(`Moved ${moveIds.length} item${moveIds.length === 1 ? "" : "s"} to ${clean}`)
          }
          onFolderCreated(clean, !!moveIds?.length)
          onClose()
        })
      }}
    >
      <DialogHeader>
        <DialogTitle>New folder</DialogTitle>
        <DialogDescription>
          {moveIds?.length
            ? `The ${moveIds.length} selected item${moveIds.length === 1 ? "" : "s"} will be moved into it.`
            : "Folders are saved once you upload or move something into them."}
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-2">
        <Input autoFocus placeholder="Folder name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        {exists && !moveIds?.length && <p className="text-xs text-muted-foreground">That folder already exists — it will open.</p>}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <SubmitButton pending={pending} disabled={!clean}>Create</SubmitButton>
      </DialogFooter>
    </form>
  )
}

function RenameFolder({ folder, onClose, onFolderRenamed }: DamDialogsProps & { folder: string }) {
  const [name, setName] = React.useState(folder)
  const { pending, run } = useSubmit()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(async () => {
          await renameDamFolder(folder, name)
          onFolderRenamed(folder, name.trim().replace(/\s+/g, " "))
          toast.success("Folder renamed")
          onClose()
        })
      }}
    >
      <DialogHeader>
        <DialogTitle>Rename folder</DialogTitle>
      </DialogHeader>
      <div className="py-4">
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} onFocus={(e) => e.target.select()} maxLength={120} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <SubmitButton pending={pending} disabled={!name.trim() || name.trim() === folder}>Rename</SubmitButton>
      </DialogFooter>
    </form>
  )
}

function DeleteFolder({ folder, count, canDelete, onClose, onFolderDeleted }: DamDialogsProps & { folder: string; count: number }) {
  const [deleteContents, setDeleteContents] = React.useState(false)
  const { pending, run } = useSubmit()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(async () => {
          const n = await deleteDamFolder(folder, deleteContents)
          onFolderDeleted(folder)
          toast.success(deleteContents ? `Deleted folder and ${n} item${n === 1 ? "" : "s"}` : `Folder removed; ${n} item${n === 1 ? "" : "s"} moved to Unfiled`)
          onClose()
        })
      }}
    >
      <DialogHeader>
        <DialogTitle>Delete “{folder}”?</DialogTitle>
        <DialogDescription>
          {count === 0
            ? "This folder is empty."
            : deleteContents
              ? `All ${count} item${count === 1 ? "" : "s"} inside will be permanently deleted.`
              : `The ${count} item${count === 1 ? "" : "s"} inside will be moved to Unfiled.`}
        </DialogDescription>
      </DialogHeader>
      {count > 0 && canDelete && (
        <label className="flex items-center gap-2 py-4 text-[13px]">
          <Checkbox checked={deleteContents} onCheckedChange={(v) => setDeleteContents(v === true)} />
          Also delete everything inside
        </label>
      )}
      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <SubmitButton pending={pending} variant="destructive">Delete folder</SubmitButton>
      </DialogFooter>
    </form>
  )
}

// ── Sharing ──────────────────────────────────────────────────────────────

function ShareLink({ target }: { target: ShareTarget }) {
  const [days, setDays] = React.useState("7")
  const [link, setLink] = React.useState<{ url: string; expiresAt: string } | null>(null)
  const [copied, setCopied] = React.useState(false)
  const { pending, run } = useSubmit()

  const create = () =>
    run(async () => {
      const result = await createDamShareLink(
        target.kind === "asset" ? { kind: "asset", id: target.id } : { kind: "folder", folder: target.folder },
        Number(days)
      )
      setLink(result)
      setCopied(false)
    })

  const copy = async () => {
    if (!link) return
    await navigator.clipboard.writeText(link.url)
    setCopied(true)
    toast.success("Link copied")
  }

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Share {target.kind === "asset" ? `“${target.name}”` : `folder “${target.folder}”`}</DialogTitle>
        <DialogDescription>
          Anyone with the link can view and download {target.kind === "asset" ? "this file" : "everything in this folder"} — no
          account needed.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Label>Link expires after</Label>
            <Select value={days} onValueChange={(v) => { setDays(v); setLink(null) }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={create} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Link2 />}
            {link ? "New link" : "Create link"}
          </Button>
        </div>
        {link && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input readOnly value={link.url} onFocus={(e) => e.target.select()} className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copy link">
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Expires {new Date(link.expiresAt).toLocaleDateString(undefined, { dateStyle: "medium" })}.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
