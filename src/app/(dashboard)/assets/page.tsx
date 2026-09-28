import type { Metadata } from "next"
import { requireTenantAccess } from "@/lib/auth/tenant-context"
import { damPermissions, DAM_TYPES } from "@/lib/dam/assets"
import type { DamAssetType } from "@/lib/dam/types"
import { DamBrowser } from "@/components/dam/dam-browser"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Assets" }

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string; type?: string }>
}) {
  const [{ role }, params] = await Promise.all([requireTenantAccess(), searchParams])
  const type = DAM_TYPES.includes(params.type as DamAssetType) ? (params.type as DamAssetType) : null

  return (
    <DamBrowser
      key={role}
      permissions={damPermissions(role)}
      initialFolder={params.folder || null}
      initialType={type}
    />
  )
}
