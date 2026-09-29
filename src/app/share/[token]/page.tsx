import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { and, asc, eq } from "drizzle-orm"
import { format } from "date-fns"
import { db } from "@/lib/db"
import { assets, tenants } from "@/lib/db/schema"
import { verifyShareToken } from "@/lib/dam/share"
import { toDamAsset } from "@/lib/dam/assets"
import type { DamAsset } from "@/lib/dam/types"
import { AssetThumb } from "@/components/dam/dam-utils"
import { formatBytes } from "@/lib/dam/format"
import { DownloadButton } from "./download-button"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Shared files", robots: { index: false, follow: false } }

const FOLDER_LIMIT = 500

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const payload = verifyShareToken(token)
  if (!payload) return <Expired />

  const [tenant] = await db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, payload.t))
  if (!tenant) notFound()

  let items: DamAsset[]
  if (payload.k === "asset") {
    const rows = await db.select().from(assets).where(and(eq(assets.id, payload.id), eq(assets.tenantId, payload.t)))
    items = rows.map((row) => toDamAsset(row))
  } else {
    const rows = await db
      .select()
      .from(assets)
      .where(and(eq(assets.tenantId, payload.t), eq(assets.folder, payload.f)))
      .orderBy(asc(assets.name))
      .limit(FOLDER_LIMIT)
    items = rows.map((row) => toDamAsset(row))
  }
  if (payload.k === "asset" && !items.length) return <Expired />

  const expires = format(new Date(payload.exp), "MMM d, yyyy")

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="font-semibold">axxes.<span className="text-purple-500">club</span></span>
          <span className="text-xs text-muted-foreground">Shared by {tenant.name} · link expires {expires}</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {payload.k === "asset" ? (
          <SingleAsset asset={items[0]} />
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight">{payload.f}</h1>
              <p className="text-[13px] text-muted-foreground">{items.length} file{items.length === 1 ? "" : "s"}</p>
            </div>
            {items.length === 0 ? (
              <p className="py-16 text-center text-muted-foreground">This folder is empty.</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
                {items.map((asset) => (
                  <div key={asset.id} className="border bg-card">
                    <a href={asset.url} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden bg-muted">
                      <AssetThumb asset={asset} />
                    </a>
                    <div className="flex items-center gap-2 p-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium" title={asset.name}>{asset.name}</p>
                        <p className="text-[11px] text-muted-foreground">{formatBytes(asset.size)}</p>
                      </div>
                      <DownloadButton asset={asset} compact />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function SingleAsset({ asset }: { asset: DamAsset }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold tracking-tight">{asset.name}</h1>
          <p className="text-[13px] text-muted-foreground">
            {asset.mimeType ?? asset.type} · {formatBytes(asset.size)}
          </p>
        </div>
        <DownloadButton asset={asset} />
      </div>
      <div className="flex max-h-[75vh] min-h-64 items-center justify-center overflow-hidden border bg-muted/40">
        {asset.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.url} alt={asset.altText ?? asset.name} className="max-h-[75vh] max-w-full object-contain" />
        ) : asset.type === "video" ? (
          <video src={asset.url} controls className="max-h-[75vh] max-w-full" />
        ) : asset.mimeType === "application/pdf" ? (
          <iframe src={asset.url} title={asset.name} className="h-[75vh] w-full bg-white" />
        ) : (
          <div className="h-40 w-40"><AssetThumb asset={asset} iconClassName="h-16 w-16" /></div>
        )}
      </div>
      {asset.description && <p className="max-w-2xl whitespace-pre-wrap text-[13px]">{asset.description}</p>}
    </div>
  )
}

function Expired() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
      <span className="mb-4 font-semibold">axxes.<span className="text-purple-500">club</span></span>
      <h1 className="text-xl font-semibold">This link is no longer available</h1>
      <p className="max-w-sm text-[13px] text-muted-foreground">
        It may have expired, or the file was removed. Ask the person who shared it for a new link.
      </p>
    </div>
  )
}
