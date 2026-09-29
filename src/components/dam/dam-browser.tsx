"use client"

import * as React from "react"
import { format } from "date-fns"
import {
  AlertTriangle,
  ArrowDownUp,
  Check,
  ChevronRight,
  Copy,
  CopyPlus,
  Download,
  ExternalLink,
  Eye,
  FilePen,
  FileText,
  Folder,
  FolderInput,
  FolderOpen,
  FolderPen,
  FolderPlus,
  Smartphone,
  Image as ImageIcon,
  Inbox,
  Info,
  LayoutGrid,
  Link2,
  List,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Share2,
  SquareCheck,
  Tag,
  Trash2,
  Upload,
  UploadCloud,
  Video,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { cn } from "@/lib/utils"
import { useUploadThing } from "@/lib/uploadthing/client"
import { duplicateDamAsset, listDamTags, moveDamAssets } from "@/lib/actions/dam"
import { PhotoHandoffDialog } from "./photo-handoff-dialog"
import { DAM_FOLDER_HEADER } from "@/lib/dam/upload-headers"
import { appTarget } from "@/lib/dam/app-links"
import {
  DAM_UNFILED,
  type DamAsset,
  type DamAssetType,
  type DamOverview,
  type DamPage,
  type DamPermissions,
  type DamQuery,
  type DamSort,
} from "@/lib/dam/types"
import { AssetThumb, downloadAsset, formatBytes } from "./dam-utils"
import { DamDialogs, type DamDialogState } from "./dam-dialogs"
import { DamDetails, DamPreview } from "./dam-details"

const DRAG_MIME = "application/x-dam-ids"
const VIEW_KEY = "dam:view"

const officeTarget = appTarget("office")

/**
 * Whether a file is worth offering to open in Office.
 *
 * Documents and spreadsheets, because those are what Office edits. A video or
 * a photo is not something Quill can usefully turn into a document, and
 * offering it anyway would be a menu item that produces an empty file.
 */
function canOpenInOffice(asset: DamAsset): boolean {
  if (asset.type !== "document") return false
  const mime = asset.mimeType ?? ""
  return !mime.startsWith("video/") && !mime.startsWith("audio/")
}

const TYPE_VIEWS: { type: DamAssetType; label: string; icon: React.ElementType }[] = [
  { type: "image", label: "Images", icon: ImageIcon },
  { type: "video", label: "Videos", icon: Video },
  { type: "document", label: "Documents", icon: FileText },
]

const SORTS: { value: DamSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
  { value: "largest", label: "Largest first" },
  { value: "smallest", label: "Smallest first" },
]

type MenuTarget = { kind: "assets"; ids: string[] } | { kind: "background" }

interface DamBrowserProps {
  permissions: DamPermissions
  initialFolder: string | null
  initialType: DamAssetType | null
  /** Carried into every Office deep link, so one opens in the right workspace. */
  tenantId?: string
}

function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, cache: "no-store" })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.error ?? "Request failed")
  return body as T
}

function assetsUrl(query: DamQuery) {
  const params = new URLSearchParams()
  if (query.q) params.set("q", query.q)
  if (query.type) params.set("type", query.type)
  if (query.folder) params.set("folder", query.folder)
  if (query.sort) params.set("sort", query.sort)
  if (query.offset) params.set("offset", String(query.offset))
  return `/api/dam/assets?${params}`
}

function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)
}

function plural(n: number, word: string) {
  return `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`
}

export function DamBrowser({ permissions, initialFolder, initialType, tenantId }: DamBrowserProps) {
  const { canWrite, canDelete } = permissions

  // ── View state ──
  const [folder, setFolder] = React.useState<string | null>(initialFolder)
  const [type, setType] = React.useState<DamAssetType | null>(initialFolder ? null : initialType)
  const [search, setSearch] = React.useState("")
  const q = useDebounced(search.trim(), 300)
  const [sort, setSort] = React.useState<DamSort>("newest")
  const [view, setView] = React.useState<"grid" | "list">("grid")

  // ── Data ──
  const [assets, setAssets] = React.useState<DamAsset[]>([])
  const [total, setTotal] = React.useState(0)
  const [nextOffset, setNextOffset] = React.useState<number | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [overview, setOverview] = React.useState<DamOverview | null>(null)
  const [draftFolders, setDraftFolders] = React.useState<string[]>([])
  const [tagSuggestions, setTagSuggestions] = React.useState<string[]>([])
  const loadController = React.useRef<AbortController | null>(null)

  // ── Interaction ──
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [anchorId, setAnchorId] = React.useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = React.useState(true)
  const [previewIndex, setPreviewIndex] = React.useState<number | null>(null)
  const [handoffOpen, setHandoffOpen] = React.useState(false)
  const [dialog, setDialog] = React.useState<DamDialogState>(null)
  const [menuTarget, setMenuTarget] = React.useState<MenuTarget>({ kind: "background" })
  const [folderMenu, setFolderMenu] = React.useState<string | null>(null)
  const [fileDrag, setFileDrag] = React.useState(false)
  const [dropFolder, setDropFolder] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(VIEW_KEY)
      if (stored === "grid" || stored === "list") setView(stored)
    } catch {}
  }, [])

  const changeView = (v: "grid" | "list") => {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {}
  }

  // Keep the URL shareable without re-rendering the server page
  React.useEffect(() => {
    const params = new URLSearchParams()
    if (folder) params.set("folder", folder)
    else if (type) params.set("type", type)
    const qs = params.toString()
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname)
  }, [folder, type])

  // ── Loading ──
  const refreshOverview = React.useCallback(async () => {
    try {
      setOverview(await fetchJson<DamOverview>("/api/dam/overview"))
    } catch {}
  }, [])

  React.useEffect(() => {
    refreshOverview()
  }, [refreshOverview])

  React.useEffect(() => {
    loadController.current?.abort()
    const controller = new AbortController()
    loadController.current = controller
    setLoading(true)
    setLoadError(null)
    fetchJson<DamPage>(assetsUrl({ q, type, folder, sort }), controller.signal)
      .then((page) => {
        setAssets(page.assets)
        setTotal(page.total)
        setNextOffset(page.nextOffset)
        setSelected(new Set())
        setLoading(false)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setLoadError(err instanceof Error ? err.message : "Failed to load assets")
        setLoading(false)
      })
    return () => controller.abort()
  }, [q, type, folder, sort, reloadKey])

  const reload = React.useCallback(() => {
    setReloadKey((k) => k + 1)
    refreshOverview()
  }, [refreshOverview])

  const loadMore = async () => {
    if (nextOffset == null || loadingMore) return
    const signal = loadController.current?.signal
    setLoadingMore(true)
    try {
      const page = await fetchJson<DamPage>(assetsUrl({ q, type, folder, sort, offset: nextOffset }), signal)
      setAssets((prev) => {
        const seen = new Set(prev.map((a) => a.id))
        return [...prev, ...page.assets.filter((a) => !seen.has(a.id))]
      })
      setTotal(page.total)
      setNextOffset(page.nextOffset)
    } catch (err) {
      if (signal?.aborted) return
      toast.error(err instanceof Error ? err.message : "Failed to load more")
    } finally {
      setLoadingMore(false)
    }
  }

  // ── Derived ──
  const folderNames = React.useMemo(() => {
    const names = new Set(overview?.folders.map((f) => f.name) ?? [])
    draftFolders.forEach((f) => names.add(f))
    return Array.from(names).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
  }, [overview, draftFolders])
  const folderCounts = React.useMemo(() => new Map(overview?.folders.map((f) => [f.name, f.count]) ?? []), [overview])

  const assetById = React.useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets])
  const selectedIds = React.useMemo(() => assets.filter((a) => selected.has(a.id)).map((a) => a.id), [assets, selected])
  const singleSelected = selectedIds.length === 1 ? assetById.get(selectedIds[0]) ?? null : null
  const uploadFolder = folder && folder !== DAM_UNFILED ? folder : null

  const title = folder === DAM_UNFILED ? "Unfiled" : folder ?? (type ? TYPE_VIEWS.find((t) => t.type === type)!.label : "All assets")

  const navigate = (next: { folder?: string | null; type?: DamAssetType | null }) => {
    setFolder(next.folder ?? null)
    setType(next.folder ? null : next.type ?? null)
    setSelected(new Set())
    setAnchorId(null)
  }

  // ── Selection ──
  const selectOnly = (id: string) => {
    setSelected(new Set([id]))
    setAnchorId(id)
  }

  const handleItemClick = (e: React.MouseEvent, asset: DamAsset, index: number) => {
    e.stopPropagation()
    if (e.shiftKey && anchorId) {
      const anchorIndex = assets.findIndex((a) => a.id === anchorId)
      if (anchorIndex >= 0) {
        const [from, to] = anchorIndex < index ? [anchorIndex, index] : [index, anchorIndex]
        const range = assets.slice(from, to + 1).map((a) => a.id)
        setSelected((prev) => new Set(e.metaKey || e.ctrlKey ? [...prev, ...range] : range))
        return
      }
    }
    if (e.metaKey || e.ctrlKey) {
      toggle(asset.id)
      return
    }
    selectOnly(asset.id)
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setAnchorId(id)
  }

  const selectAll = () => setSelected(new Set(assets.map((a) => a.id)))
  const clearSelection = () => setSelected(new Set())

  // ── Actions ──
  const openPreview = (id: string) => {
    const index = assets.findIndex((a) => a.id === id)
    if (index >= 0) setPreviewIndex(index)
  }

  const downloadMany = async (ids: string[]) => {
    const list = ids.map((id) => assetById.get(id)).filter((a): a is DamAsset => !!a)
    if (list.length > 1) toast.info(`Downloading ${list.length} files…`)
    for (const asset of list) {
      await downloadAsset(asset)
      await new Promise((r) => setTimeout(r, 250))
    }
  }

  const copyLinks = async (ids: string[]) => {
    const urls = ids.map((id) => assetById.get(id)?.url).filter(Boolean)
    await navigator.clipboard.writeText(urls.join("\n"))
    toast.success(urls.length === 1 ? "File URL copied" : `${urls.length} URLs copied`)
  }

  const duplicate = async (id: string) => {
    try {
      await duplicateDamAsset(id)
      toast.success("Duplicated")
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Duplicate failed")
    }
  }

  const askDelete = (ids: string[]) => {
    if (!canDelete || !ids.length) return
    const label = ids.length === 1 ? `“${assetById.get(ids[0])?.name ?? "this item"}”` : plural(ids.length, "item")
    setDialog({ kind: "delete", ids, label })
  }

  const moveTo = async (ids: string[], target: string | null) => {
    if (!canWrite || !ids.length) return
    try {
      const n = await moveDamAssets(ids, target)
      handleMoved(ids, target)
      toast.success(`Moved ${plural(n, "item")} to ${target ?? "Unfiled"}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Move failed")
    }
  }

  const openTagDialog = (ids: string[]) => {
    setDialog({ kind: "tags", ids })
    listDamTags().then(setTagSuggestions).catch(() => {})
  }

  // ── Local state updates after mutations ──
  const leavesView = (asset: { folder: string | null }) =>
    folder !== null && (folder === DAM_UNFILED ? asset.folder !== null : asset.folder !== folder)

  const handleUpdated = (updated: DamAsset) => {
    if (leavesView(updated)) {
      setAssets((prev) => prev.filter((a) => a.id !== updated.id))
      setTotal((t) => Math.max(0, t - 1))
      clearSelection()
    } else {
      setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    }
    refreshOverview()
  }

  const handleMoved = (ids: string[], target: string | null) => {
    const idSet = new Set(ids)
    if (leavesView({ folder: target })) {
      setAssets((prev) => prev.filter((a) => !idSet.has(a.id)))
      setTotal((t) => Math.max(0, t - ids.length))
      clearSelection()
    } else {
      setAssets((prev) => prev.map((a) => (idSet.has(a.id) ? { ...a, folder: target } : a)))
    }
    if (target) setDraftFolders((d) => d.filter((f) => f !== target))
    refreshOverview()
  }

  const handleDeleted = (ids: string[]) => {
    const idSet = new Set(ids)
    setAssets((prev) => prev.filter((a) => !idSet.has(a.id)))
    setTotal((t) => Math.max(0, t - ids.length))
    clearSelection()
    setPreviewIndex(null)
    refreshOverview()
  }

  // ── Uploads ──
  const uploadToastId = React.useRef<string | number | null>(null)
  const { startUpload, isUploading } = useUploadThing("damUploader", {
    headers: (): Record<string, string> => (uploadFolder ? { [DAM_FOLDER_HEADER]: encodeURIComponent(uploadFolder) } : {}),
    onUploadProgress: (p) => {
      if (uploadToastId.current != null) toast.loading(`Uploading… ${Math.round(p)}%`, { id: uploadToastId.current })
    },
    onClientUploadComplete: (res) => {
      toast.success(`Uploaded ${plural(res.length, "file")}`, { id: uploadToastId.current ?? undefined })
      uploadToastId.current = null
      if (uploadFolder) setDraftFolders((d) => d.filter((f) => f !== uploadFolder))
      reload()
    },
    onUploadError: (error) => {
      toast.error(error.message || "Upload failed", { id: uploadToastId.current ?? undefined })
      uploadToastId.current = null
    },
  })

  const uploadFiles = (files: File[]) => {
    if (!canWrite || !files.length) return
    uploadToastId.current = toast.loading(`Uploading ${plural(files.length, "file")}…`)
    startUpload(files)
  }

  // ── Keyboard shortcuts ──
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (dialog || previewIndex != null || isTypingTarget(e.target)) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault()
        selectAll()
      } else if (e.key === "Escape") {
        clearSelection()
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length) {
        e.preventDefault()
        askDelete(selectedIds)
      } else if (e.key === "Enter" && singleSelected) {
        openPreview(singleSelected.id)
      } else if (e.key === "F2" && singleSelected && canWrite) {
        e.preventDefault()
        setDialog({ kind: "rename", asset: singleSelected })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  // ── Context-menu targeting: one menu for the whole grid ──
  const onGridContextMenu = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-asset-id]")
    const id = el?.dataset.assetId
    if (!id) {
      setMenuTarget({ kind: "background" })
      return
    }
    if (selected.has(id)) {
      setMenuTarget({ kind: "assets", ids: selectedIds })
    } else {
      selectOnly(id)
      setMenuTarget({ kind: "assets", ids: [id] })
    }
  }

  // ── Drag & drop ──
  const onItemDragStart = (e: React.DragEvent, id: string) => {
    if (!canWrite) return
    const ids = selected.has(id) ? selectedIds : [id]
    if (!selected.has(id)) selectOnly(id)
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(ids))
    e.dataTransfer.effectAllowed = "move"
  }

  const folderDropProps = (target: string | null) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!canWrite || !e.dataTransfer.types.includes(DRAG_MIME)) return
      e.preventDefault()
      setDropFolder(target ?? DAM_UNFILED)
    },
    onDragLeave: () => setDropFolder(null),
    onDrop: (e: React.DragEvent) => {
      setDropFolder(null)
      const raw = e.dataTransfer.getData(DRAG_MIME)
      if (!raw) return
      e.preventDefault()
      moveTo(JSON.parse(raw) as string[], target)
    },
  })

  const showDetails = detailsOpen && singleSelected

  // ── Render ──
  return (
    <div className="flex h-[calc(100dvh-7rem)] overflow-hidden border bg-background lg:h-[calc(100dvh-4rem)]">
      {/* Folder rail */}
      <ContextMenu modal={false} onOpenChange={(open) => !open && setFolderMenu(null)}>
        <ContextMenuTrigger asChild>
          <nav
            className="hidden w-60 shrink-0 flex-col border-r md:flex"
            aria-label="Asset folders"
            onContextMenu={(e) => {
              const el = (e.target as HTMLElement).closest<HTMLElement>("[data-folder]")
              setFolderMenu(el?.dataset.folder ?? null)
            }}
          >
            <div className="border-b p-3">
              <NewMenu
                onHandoff={() => setHandoffOpen(true)}
                canWrite={canWrite}
                onUpload={() => fileInputRef.current?.click()}
                onAddUrl={() => setDialog({ kind: "add-url", folder: uploadFolder })}
                onNewFolder={() => setDialog({ kind: "new-folder" })}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2 text-[13px]">
              <RailItem active={!folder && !type} onClick={() => navigate({})} icon={LayoutGrid} label="All assets" count={overview?.counts.all} />
              {TYPE_VIEWS.map((t) => (
                <RailItem
                  key={t.type}
                  active={!folder && type === t.type}
                  onClick={() => navigate({ type: t.type })}
                  icon={t.icon}
                  label={t.label}
                  count={overview?.counts[t.type as "image" | "video" | "document"]}
                />
              ))}

              <div className="mb-1 mt-5 flex items-center justify-between px-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Folders</span>
                {canWrite && (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setDialog({ kind: "new-folder" })}
                    aria-label="New folder"
                    title="New folder"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
              <RailItem
                active={folder === DAM_UNFILED}
                onClick={() => navigate({ folder: DAM_UNFILED })}
                icon={Inbox}
                label="Unfiled"
                count={overview?.counts.unfiled}
                dropActive={dropFolder === DAM_UNFILED}
                {...folderDropProps(null)}
              />
              {folderNames.map((name) => (
                <RailItem
                  key={name}
                  data-folder={name}
                  active={folder === name}
                  onClick={() => navigate({ folder: name })}
                  icon={folder === name ? FolderOpen : Folder}
                  label={name}
                  count={folderCounts.get(name) ?? 0}
                  dropActive={dropFolder === name}
                  {...folderDropProps(name)}
                />
              ))}
              {overview && folderNames.length === 0 && (
                <p className="px-2 py-2 text-xs text-muted-foreground">No folders yet.</p>
              )}
            </div>
          </nav>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {folderMenu ? (
            <>
              <ContextMenuLabel>{folderMenu}</ContextMenuLabel>
              <ContextMenuItem onSelect={() => navigate({ folder: folderMenu })}>
                <FolderOpen /> Open
              </ContextMenuItem>
              {canWrite && (
                <>
                  <ContextMenuItem
                    onSelect={() => {
                      navigate({ folder: folderMenu })
                      setTimeout(() => fileInputRef.current?.click(), 0)
                    }}
                  >
                    <Upload /> Upload here…
                  </ContextMenuItem>
                  <ContextMenuItem onSelect={() => setDialog({ kind: "share", target: { kind: "folder", folder: folderMenu } })}>
                    <Share2 /> Share folder…
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    disabled={!folderCounts.get(folderMenu)}
                    onSelect={() => setDialog({ kind: "rename-folder", folder: folderMenu })}
                  >
                    <FolderPen /> Rename…
                  </ContextMenuItem>
                  <ContextMenuItem
                    destructive
                    onSelect={() => {
                      const count = folderCounts.get(folderMenu) ?? 0
                      if (count === 0) {
                        setDraftFolders((d) => d.filter((f) => f !== folderMenu))
                        if (folder === folderMenu) navigate({})
                        return
                      }
                      setDialog({ kind: "delete-folder", folder: folderMenu, count })
                    }}
                  >
                    <Trash2 /> Delete folder…
                  </ContextMenuItem>
                </>
              )}
            </>
          ) : (
            <>
              <ContextMenuItem disabled={!canWrite} onSelect={() => setDialog({ kind: "new-folder" })}>
                <FolderPlus /> New folder…
              </ContextMenuItem>
              <ContextMenuItem onSelect={refreshOverview}>
                <RefreshCw /> Refresh folders
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Main column */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
          <div className="md:hidden">
            <NewMenu
              onHandoff={() => setHandoffOpen(true)}
              compact
              canWrite={canWrite}
              onUpload={() => fileInputRef.current?.click()}
              onAddUrl={() => setDialog({ kind: "add-url", folder: uploadFolder })}
              onNewFolder={() => setDialog({ kind: "new-folder" })}
            />
          </div>
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Search ${title.toLowerCase()}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8"
            />
            {search && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Select value={sort} onValueChange={(v) => setSort(v as DamSort)}>
              <SelectTrigger className="h-8 w-auto gap-2 border-none text-[13px] shadow-none" aria-label="Sort">
                <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex border">
              <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon-sm" onClick={() => changeView("grid")} aria-label="Grid view">
                <LayoutGrid />
              </Button>
              <Button variant={view === "list" ? "secondary" : "ghost"} size="icon-sm" onClick={() => changeView("list")} aria-label="List view">
                <List />
              </Button>
            </div>
            <Button
              variant={detailsOpen ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setDetailsOpen((o) => !o)}
              aria-label="Toggle details panel"
              title="Details"
            >
              <Info />
            </Button>
          </div>
        </div>

        {/* Title / selection bar */}
        {selectedIds.length > 1 || (selectedIds.length === 1 && !showDetails) ? (
          <div className="flex h-11 shrink-0 items-center gap-1 border-b bg-accent/40 px-3 text-[13px]">
            <Button variant="ghost" size="icon-sm" onClick={clearSelection} aria-label="Clear selection">
              <X />
            </Button>
            <span className="mr-2 font-medium">{plural(selectedIds.length, "item")} selected</span>
            <Button variant="ghost" size="sm" onClick={() => downloadMany(selectedIds)}><Download /> Download</Button>
            {canWrite && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setDialog({ kind: "move", ids: selectedIds })}><FolderInput /> Move</Button>
                <Button variant="ghost" size="sm" onClick={() => openTagDialog(selectedIds)}><Tag /> Tag</Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={() => copyLinks(selectedIds)}><Link2 /> Copy URLs</Button>
            {canDelete && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => askDelete(selectedIds)}>
                <Trash2 /> Delete
              </Button>
            )}
          </div>
        ) : (
          <div className="flex h-11 shrink-0 items-center gap-2 border-b px-4 text-[13px]">
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => navigate({})}>
              Library
            </button>
            {(folder || type) && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate font-medium">{title}</span>
              </>
            )}
            {q && <span className="truncate text-muted-foreground">· results for “{q}”</span>}
            <span className="ml-auto shrink-0 text-muted-foreground">{loading ? "Loading…" : plural(total, "item")}</span>
          </div>
        )}

        {/* Grid */}
        {/* Menus are non-modal: a modal menu that opens a dialog leaves pointer-events stuck on <body> */}
        <ContextMenu modal={false}>
          <ContextMenuTrigger asChild>
            <div
              className="relative min-h-0 flex-1 overflow-y-auto"
              onClick={clearSelection}
              onContextMenu={onGridContextMenu}
              onDragOver={(e) => {
                if (!canWrite || !e.dataTransfer.types.includes("Files")) return
                e.preventDefault()
                setFileDrag(true)
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setFileDrag(false)
              }}
              onDrop={(e) => {
                if (!e.dataTransfer.types.includes("Files")) return
                e.preventDefault()
                setFileDrag(false)
                uploadFiles(Array.from(e.dataTransfer.files))
              }}
            >
              {fileDrag && (
                <div className="pointer-events-none absolute inset-3 z-20 flex flex-col items-center justify-center border-2 border-dashed border-primary bg-background/90">
                  <UploadCloud className="mb-2 h-10 w-10" />
                  <p className="text-[13px] font-medium">Drop to upload to {uploadFolder ?? "the library"}</p>
                </div>
              )}

              {loadError ? (
                <EmptyState icon={AlertTriangle} title="Couldn't load assets" body={loadError}>
                  <Button variant="outline" onClick={reload}>Try again</Button>
                </EmptyState>
              ) : loading && assets.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : assets.length === 0 ? (
                <EmptyState
                  icon={q ? Search : Folder}
                  title={q ? "No matches" : folder && folder !== DAM_UNFILED ? "This folder is empty" : "Nothing here yet"}
                  body={q ? "Try a different search or clear filters." : canWrite ? "Drag files here, or right-click for more options." : undefined}
                >
                  {canWrite && !q && (
                    <>
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload /> Upload files
                      </Button>
                      <Button variant="outline" className="ml-2" onClick={() => setHandoffOpen(true)}>
                        <Smartphone className="mr-2 h-4 w-4" /> Upload from phone
                      </Button>
                    </>
                  )}
                </EmptyState>
              ) : (
                <div className={cn("p-4", loading && "opacity-60")}>
                  {view === "grid" ? (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                      {assets.map((asset, index) => (
                        <GridItem
                          key={asset.id}
                          asset={asset}
                          selected={selected.has(asset.id)}
                          selecting={selected.size > 0}
                          draggable={canWrite}
                          onClick={(e) => handleItemClick(e, asset, index)}
                          onDoubleClick={() => openPreview(asset.id)}
                          onToggle={() => toggle(asset.id)}
                          onDragStart={(e) => onItemDragStart(e, asset.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <ListView
                      assets={assets}
                      selected={selected}
                      draggable={canWrite}
                      onItemClick={handleItemClick}
                      onOpen={openPreview}
                      onToggle={toggle}
                      onToggleAll={() => (selected.size === assets.length ? clearSelection() : selectAll())}
                      onDragStart={onItemDragStart}
                    />
                  )}

                  {nextOffset != null && (
                    <div className="mt-6 flex justify-center">
                      <Button variant="outline" onClick={(e) => { e.stopPropagation(); loadMore() }} disabled={loadingMore}>
                        {loadingMore && <Loader2 className="animate-spin" />}
                        Load more ({(total - assets.length).toLocaleString()} remaining)
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ContextMenuTrigger>

          <ContextMenuContent>
            {menuTarget.kind === "assets" && menuTarget.ids.length > 0 ? (
              <AssetMenuItems
                ids={menuTarget.ids}
                asset={menuTarget.ids.length === 1 ? assetById.get(menuTarget.ids[0]) ?? null : null}
                folders={folderNames}
                currentFolder={folder}
                canWrite={canWrite}
                canDelete={canDelete}
                onPreview={openPreview}
                onDetails={(id) => { selectOnly(id); setDetailsOpen(true) }}
                onDownload={downloadMany}
                onCopyLinks={copyLinks}
                onShare={(a) => setDialog({ kind: "share", target: { kind: "asset", id: a.id, name: a.name } })}
                onRename={(a) => setDialog({ kind: "rename", asset: a })}
                onMoveTo={moveTo}
                onMoveNewFolder={(ids) => setDialog({ kind: "new-folder", moveIds: ids })}
                onTag={openTagDialog}
                onDuplicate={duplicate}
                onDelete={askDelete}
                tenantId={tenantId}
              />
            ) : (
              <>
                <ContextMenuItem disabled={!canWrite} onSelect={() => fileInputRef.current?.click()}>
                  <Upload /> Upload files…
                </ContextMenuItem>
                <ContextMenuItem disabled={!canWrite} onSelect={() => setHandoffOpen(true)}>
                  <Smartphone /> Upload from phone
                </ContextMenuItem>
                <ContextMenuItem disabled={!canWrite} onSelect={() => setDialog({ kind: "add-url", folder: uploadFolder })}>
                  <Link2 /> Add from URL…
                </ContextMenuItem>
                <ContextMenuItem disabled={!canWrite} onSelect={() => setDialog({ kind: "new-folder" })}>
                  <FolderPlus /> New folder…
                </ContextMenuItem>
                {uploadFolder && canWrite && (
                  <ContextMenuItem onSelect={() => setDialog({ kind: "share", target: { kind: "folder", folder: uploadFolder } })}>
                    <Share2 /> Share this folder…
                  </ContextMenuItem>
                )}
                <ContextMenuSeparator />
                <ContextMenuItem disabled={!assets.length} onSelect={selectAll}>
                  <SquareCheck /> Select all <ContextMenuShortcut>⌘A</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuSub>
                  <ContextMenuSubTrigger><ArrowDownUp /> Sort by</ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    {SORTS.map((s) => (
                      <ContextMenuItem key={s.value} onSelect={() => setSort(s.value)}>
                        {s.label}
                        {sort === s.value && <Check className="ml-auto" />}
                      </ContextMenuItem>
                    ))}
                  </ContextMenuSubContent>
                </ContextMenuSub>
                <ContextMenuItem onSelect={() => changeView(view === "grid" ? "list" : "grid")}>
                  {view === "grid" ? <List /> : <LayoutGrid />} {view === "grid" ? "List view" : "Grid view"}
                </ContextMenuItem>
                <ContextMenuItem onSelect={reload}>
                  <RefreshCw /> Refresh
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>
      </div>

      {/* Details */}
      {showDetails && (
        <DamDetails
          asset={singleSelected}
          folders={folderNames}
          canWrite={canWrite}
          canDelete={canDelete}
          onClose={() => setDetailsOpen(false)}
          onSaved={handleUpdated}
          onPreview={() => openPreview(singleSelected.id)}
          onShare={() => setDialog({ kind: "share", target: { kind: "asset", id: singleSelected.id, name: singleSelected.name } })}
          onDelete={() => askDelete([singleSelected.id])}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          uploadFiles(Array.from(e.target.files ?? []))
          e.target.value = ""
        }}
      />
      {isUploading && <span className="sr-only" aria-live="polite">Uploading</span>}

      <DamDialogs
        state={dialog}
        onClose={() => setDialog(null)}
        folders={folderNames}
        tagSuggestions={tagSuggestions}
        canDelete={canDelete}
        onAssetUpdated={handleUpdated}
        onAssetCreated={() => reload()}
        onAssetsMoved={handleMoved}
        onAssetsDeleted={handleDeleted}
        onChanged={reload}
        onFolderCreated={(name, saved) => {
          // A folder only exists once it holds assets; until then keep a local placeholder
          if (!saved && !folderNames.includes(name)) setDraftFolders((d) => [...d, name])
          navigate({ folder: name })
          if (saved) refreshOverview()
        }}
        onFolderRenamed={(from, to) => {
          setDraftFolders((d) => d.filter((f) => f !== from))
          if (folder === from) setFolder(to)
          reload()
        }}
        onFolderDeleted={(name) => {
          setDraftFolders((d) => d.filter((f) => f !== name))
          if (folder === name) navigate({})
          else reload()
          refreshOverview()
        }}
      />

      <DamPreview
        assets={assets}
        index={previewIndex}
        onIndexChange={setPreviewIndex}
        onClose={() => setPreviewIndex(null)}
        tenantId={tenantId}
      />

      {handoffOpen && (
        <PhotoHandoffDialog folder={uploadFolder} onDone={reload} onClose={() => setHandoffOpen(false)} />
      )}

      {/* The file manager underneath this page is folders.axxes.club. It gets the
          credit, quietly, in the corner — never in the way of the work. */}
      <a
        href="https://folders.axxes.club"
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-none absolute bottom-2 right-3 z-10 hidden select-none items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground/45 transition-colors hover:text-muted-foreground/80 focus-visible:pointer-events-auto focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring lg:flex"
      >
        Powered by folders.axxes.club
      </a>
    </div>
  )
}

// ── Pieces ───────────────────────────────────────────────────────────────

function NewMenu({
  canWrite,
  compact,
  onUpload,
  onHandoff,
  onAddUrl,
  onNewFolder,
}: {
  canWrite: boolean
  compact?: boolean
  onUpload: () => void
  onHandoff: () => void
  onAddUrl: () => void
  onNewFolder: () => void
}) {
  if (!canWrite) return null
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button className={compact ? "" : "w-full"} size={compact ? "sm" : "default"}>
          <Plus /> New
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuItem onSelect={onUpload} className="gap-2"><Upload className="h-4 w-4" /> Upload files</DropdownMenuItem>
        <DropdownMenuItem onSelect={onHandoff} className="gap-2"><Smartphone className="h-4 w-4" /> Upload from phone</DropdownMenuItem>
        <DropdownMenuItem onSelect={onAddUrl} className="gap-2"><Link2 className="h-4 w-4" /> Add from URL</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onNewFolder} className="gap-2"><FolderPlus className="h-4 w-4" /> New folder</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function RailItem({
  active,
  onClick,
  icon: Icon,
  label,
  count,
  dropActive,
  ...rest
}: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
  count?: number
  dropActive?: boolean
  "data-folder"?: string
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: () => void
  onDrop?: (e: React.DragEvent) => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors hover:bg-accent",
        active && "bg-accent font-medium",
        dropActive && "bg-primary text-primary-foreground hover:bg-primary"
      )}
      {...rest}
    >
      <Icon className={cn("h-4 w-4 shrink-0", !dropActive && "text-muted-foreground")} />
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && <span className={cn("text-xs tabular-nums", !dropActive && "text-muted-foreground")}>{count.toLocaleString()}</span>}
    </button>
  )
}

function GridItem({
  asset,
  selected,
  selecting,
  draggable,
  onClick,
  onDoubleClick,
  onToggle,
  onDragStart,
}: {
  asset: DamAsset
  selected: boolean
  selecting: boolean
  draggable: boolean
  onClick: (e: React.MouseEvent) => void
  onDoubleClick: () => void
  onToggle: () => void
  onDragStart: (e: React.DragEvent) => void
}) {
  return (
    <div
      data-asset-id={asset.id}
      role="option"
      aria-selected={selected}
      tabIndex={0}
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={(e) => {
        if (e.key === " ") {
          e.preventDefault()
          onToggle()
        }
      }}
      className={cn(
        "group relative cursor-default select-none border bg-card outline-none transition-colors hover:border-foreground/30 focus-visible:ring-1 focus-visible:ring-ring",
        selected && "border-primary ring-1 ring-primary hover:border-primary"
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <AssetThumb asset={asset} />
        <div
          className={cn(
            "absolute left-2 top-2 transition-opacity",
            selected || selecting ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
        >
          <Checkbox checked={selected} className="bg-background shadow-sm" aria-label={`Select ${asset.name}`} />
        </div>
        {asset.type === "video" && (
          <span className="absolute bottom-2 right-2 bg-background/80 p-1"><Video className="h-3.5 w-3.5" /></span>
        )}
      </div>
      <div className="px-2.5 py-2">
        <p className="truncate text-[13px] font-medium" title={asset.name}>{asset.name}</p>
        <p className="mt-0.5 flex justify-between text-[11px] text-muted-foreground">
          <span>{formatBytes(asset.size)}</span>
          <span>{format(new Date(asset.createdAt), "MMM d, yyyy")}</span>
        </p>
      </div>
    </div>
  )
}

function ListView({
  assets,
  selected,
  draggable,
  onItemClick,
  onOpen,
  onToggle,
  onToggleAll,
  onDragStart,
}: {
  assets: DamAsset[]
  selected: Set<string>
  draggable: boolean
  onItemClick: (e: React.MouseEvent, asset: DamAsset, index: number) => void
  onOpen: (id: string) => void
  onToggle: (id: string) => void
  onToggleAll: () => void
  onDragStart: (e: React.DragEvent, id: string) => void
}) {
  const allSelected = assets.length > 0 && assets.every((a) => selected.has(a.id))
  return (
    <div className="border text-[13px]" role="listbox" aria-multiselectable>
      <div className="grid grid-cols-[32px_minmax(0,1fr)_120px_90px_110px] items-center gap-3 border-b bg-muted/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground max-md:grid-cols-[32px_minmax(0,1fr)_90px]">
        <div onClick={(e) => { e.stopPropagation(); onToggleAll() }}>
          <Checkbox checked={allSelected} aria-label="Select all" />
        </div>
        <span>Name</span>
        <span className="max-md:hidden">Folder</span>
        <span>Size</span>
        <span className="max-md:hidden">Added</span>
      </div>
      {assets.map((asset, index) => {
        const isSelected = selected.has(asset.id)
        return (
          <div
            key={asset.id}
            data-asset-id={asset.id}
            role="option"
            aria-selected={isSelected}
            tabIndex={0}
            draggable={draggable}
            onDragStart={(e) => onDragStart(e, asset.id)}
            onClick={(e) => onItemClick(e, asset, index)}
            onDoubleClick={() => onOpen(asset.id)}
            className={cn(
              "grid cursor-default select-none grid-cols-[32px_minmax(0,1fr)_120px_90px_110px] items-center gap-3 border-b px-3 py-1.5 outline-none last:border-b-0 hover:bg-accent/50 focus-visible:bg-accent max-md:grid-cols-[32px_minmax(0,1fr)_90px]",
              isSelected && "bg-accent hover:bg-accent"
            )}
          >
            <div onClick={(e) => { e.stopPropagation(); onToggle(asset.id) }}>
              <Checkbox checked={isSelected} aria-label={`Select ${asset.name}`} />
            </div>
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-9 w-9 shrink-0 overflow-hidden bg-muted">
                <AssetThumb asset={asset} iconClassName="h-4 w-4" />
              </div>
              <span className="truncate font-medium" title={asset.name}>{asset.name}</span>
            </div>
            <span className="truncate text-muted-foreground max-md:hidden">{asset.folder ?? "—"}</span>
            <span className="text-muted-foreground">{formatBytes(asset.size)}</span>
            <span className="text-muted-foreground max-md:hidden">{format(new Date(asset.createdAt), "MMM d, yyyy")}</span>
          </div>
        )
      })}
    </div>
  )
}

function AssetMenuItems({
  ids,
  asset,
  folders,
  currentFolder,
  canWrite,
  canDelete,
  onPreview,
  onDetails,
  onDownload,
  onCopyLinks,
  onShare,
  onRename,
  onMoveTo,
  onMoveNewFolder,
  onTag,
  onDuplicate,
  onDelete,
  tenantId,
}: {
  ids: string[]
  asset: DamAsset | null
  tenantId?: string
  folders: string[]
  currentFolder: string | null
  canWrite: boolean
  canDelete: boolean
  onPreview: (id: string) => void
  onDetails: (id: string) => void
  onDownload: (ids: string[]) => void
  onCopyLinks: (ids: string[]) => void
  onShare: (asset: DamAsset) => void
  onRename: (asset: DamAsset) => void
  onMoveTo: (ids: string[], folder: string | null) => void
  onMoveNewFolder: (ids: string[]) => void
  onTag: (ids: string[]) => void
  onDuplicate: (id: string) => void
  onDelete: (ids: string[]) => void
}) {
  const multi = ids.length > 1
  return (
    <>
      <ContextMenuLabel>{asset ? asset.name : plural(ids.length, "item") + " selected"}</ContextMenuLabel>
      {asset && (
        <>
          <ContextMenuItem onSelect={() => onPreview(asset.id)}>
            <Eye /> Preview <ContextMenuShortcut>↵</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => onDetails(asset.id)}>
            <Info /> Details
          </ContextMenuItem>
          {asset.appLinks?.map((link) => {
            const target = appTarget(link.appKey)
            if (!target) return null
            return (
              <ContextMenuItem
                key={link.appKey}
                onSelect={() =>
                  window.open(target.url(link.recordId, tenantId), "_blank", "noopener,noreferrer")
                }
              >
                <FilePen /> Open in {target.name}
              </ContextMenuItem>
            )
          })}
          {officeTarget && !(asset.appLinks ?? []).some((l) => l.appKey === "office") && canOpenInOffice(asset) ? (
            // No Office document yet: Office makes one the first time this is
            // used, so the item is offered on every document rather than only on
            // the few somebody set up in advance.
            <ContextMenuItem
              onSelect={() =>
                window.open(
                  officeTarget.openUnlinked!(asset.id, tenantId),
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              <FilePen /> Open in {officeTarget.name}
            </ContextMenuItem>
          ) : null}
          <ContextMenuItem onSelect={() => window.open(`https://folders.axxes.club?folder=${encodeURIComponent(asset.folder || "")}`, "_blank", "noopener,noreferrer")}>
            <ExternalLink /> Open in Folders
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => window.open(asset.url, "_blank", "noopener,noreferrer")}>
            <ExternalLink /> Open in new tab
          </ContextMenuItem>
        </>
      )}
      <ContextMenuItem onSelect={() => onDownload(ids)}>
        <Download /> Download{multi ? ` ${ids.length} files` : ""}
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => onCopyLinks(ids)}>
        <Copy /> Copy {multi ? "URLs" : "file URL"}
      </ContextMenuItem>
      {asset && canWrite && (
        <ContextMenuItem onSelect={() => onShare(asset)}>
          <Share2 /> Share…
        </ContextMenuItem>
      )}
      {canWrite && (
        <>
          <ContextMenuSeparator />
          {asset && (
            <ContextMenuItem onSelect={() => onRename(asset)}>
              <Pencil /> Rename… <ContextMenuShortcut>F2</ContextMenuShortcut>
            </ContextMenuItem>
          )}
          <ContextMenuSub>
            <ContextMenuSubTrigger><FolderInput /> Move to</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem disabled={currentFolder === DAM_UNFILED} onSelect={() => onMoveTo(ids, null)}>
                <Inbox /> Unfiled
              </ContextMenuItem>
              {folders.map((f) => (
                <ContextMenuItem key={f} disabled={currentFolder === f} onSelect={() => onMoveTo(ids, f)}>
                  <Folder /> <span className="max-w-48 truncate">{f}</span>
                </ContextMenuItem>
              ))}
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={() => onMoveNewFolder(ids)}>
                <FolderPlus /> New folder…
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuItem onSelect={() => onTag(ids)}>
            <Tag /> Add tags…
          </ContextMenuItem>
          {asset && (
            <ContextMenuItem onSelect={() => onDuplicate(asset.id)}>
              <CopyPlus /> Duplicate
            </ContextMenuItem>
          )}
        </>
      )}
      {canDelete && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem destructive onSelect={() => onDelete(ids)}>
            <Trash2 /> Delete{multi ? ` ${ids.length} items` : ""} <ContextMenuShortcut>⌫</ContextMenuShortcut>
          </ContextMenuItem>
        </>
      )}
    </>
  )
}

function EmptyState({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: React.ElementType
  title: string
  body?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex h-72 flex-col items-center justify-center gap-2 px-6 text-center">
      <Icon className="mb-2 h-10 w-10 text-muted-foreground/60" />
      <p className="font-medium">{title}</p>
      {body && <p className="max-w-sm text-[13px] text-muted-foreground">{body}</p>}
      {children && <div className="mt-3" onClick={(e) => e.stopPropagation()}>{children}</div>}
    </div>
  )
}
