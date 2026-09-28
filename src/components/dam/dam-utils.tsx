"use client"

import * as React from "react"
import { File as FileIcon, FileText, Image as ImageIcon, Music, Video } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DamAsset } from "@/lib/dam/types"

export { formatBytes } from "@/lib/dam/format"

export function AssetTypeIcon({ asset, className }: { asset: DamAsset; className?: string }) {
  if (asset.type === "image") return <ImageIcon className={className} />
  if (asset.type === "video") return <Video className={className} />
  if (asset.mimeType?.startsWith("audio/")) return <Music className={className} />
  if (asset.type === "document") return <FileText className={className} />
  return <FileIcon className={className} />
}

export function fileExtension(asset: DamAsset): string | null {
  const source = asset.originalFilename ?? new URL(asset.url, "https://x").pathname
  const ext = source.split(".").pop()
  return ext && ext.length <= 5 && ext !== source ? ext.toUpperCase() : null
}

export function AssetThumb({
  asset,
  className,
  iconClassName,
}: {
  asset: DamAsset
  className?: string
  iconClassName?: string
}) {
  const [failed, setFailed] = React.useState(false)

  if (asset.type === "image" && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={asset.thumbnailUrl ?? asset.url}
        alt={asset.altText ?? asset.name}
        loading="lazy"
        draggable={false}
        onError={() => setFailed(true)}
        className={cn("h-full w-full object-cover", className)}
      />
    )
  }

  const ext = fileExtension(asset)
  return (
    <div className={cn("flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground", className)}>
      <AssetTypeIcon asset={asset} className={cn("h-8 w-8", iconClassName)} />
      {ext && <span className="text-[10px] font-medium tracking-wider">{ext}</span>}
    </div>
  )
}

function downloadName(asset: DamAsset) {
  if (asset.originalFilename) return asset.originalFilename
  const ext = fileExtension(asset)
  return ext ? `${asset.name}.${ext.toLowerCase()}` : asset.name
}

// Saves the file when the host allows cross-origin reads; otherwise opens it in a new tab.
export async function downloadAsset(asset: DamAsset) {
  try {
    const res = await fetch(asset.url, { mode: "cors" })
    if (!res.ok) throw new Error(String(res.status))
    const blob = await res.blob()
    const href = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = href
    a.download = downloadName(asset)
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(href), 10_000)
    return true
  } catch {
    window.open(asset.url, "_blank", "noopener,noreferrer")
    return false
  }
}
