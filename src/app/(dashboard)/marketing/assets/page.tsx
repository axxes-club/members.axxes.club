import { PageHeader } from "@/components/layout/page-header"
export const dynamic = "force-dynamic"

import { SectionHeader } from "@/components/layout/section-header"
import { Card, CardContent } from "@/components/ui/card"
import { FileImage } from "lucide-react"
import { getAssets, getFolders, getAllTags } from "@/lib/actions/assets"
import { AssetLibrary } from "./asset-library"
import { AddAssetDialog } from "./add-asset-dialog"

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; folder?: string }>
}) {
  const params = await searchParams
  const filters = {
    search: params.search,
    category: params.category,
    folder: params.folder,
  }

  const [assets, folders, tags] = await Promise.all([
    getAssets(filters),
    getFolders(),
    getAllTags(),
  ])

  const stats = {
    total: assets.length,
    images: assets.filter(a => a.category === "image").length,
    videos: assets.filter(a => a.category === "video").length,
    documents: assets.filter(a => a.category === "document").length,
  }

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Asset Library"
        description="Manage your digital assets and media files"
        actions={<AddAssetDialog folders={folders} tags={tags} />}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Assets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.images}</div>
            <p className="text-sm text-muted-foreground">Images</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.videos}</div>
            <p className="text-sm text-muted-foreground">Videos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.documents}</div>
            <p className="text-sm text-muted-foreground">Documents</p>
          </CardContent>
        </Card>
      </div>

      <SectionHeader number="01" title="All Assets" description="Browse and manage your digital asset library" />

      {assets.length === 0 && !filters.search && !filters.category && !filters.folder ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileImage className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No assets yet</h3>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
              Get started by adding your first asset. Add images, videos, or documents by URL.
            </p>
            <div className="mt-6">
              <AddAssetDialog folders={folders} tags={tags} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <AssetLibrary
          assets={assets}
          folders={folders}
          tags={tags}
          filters={filters}
        />
      )}
    </div>
  )
}
