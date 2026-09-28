import { NextResponse, type NextRequest } from "next/server"
import { requireTenantAccess } from "@/lib/auth/tenant-context"
import { queryDamAssets } from "@/lib/dam/queries"
import type { DamAssetType, DamSort } from "@/lib/dam/types"

// Reads go through a route handler (not a server action) so they run in parallel and can be aborted
export async function GET(req: NextRequest) {
  const context = await requireTenantAccess().catch(() => null)
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const params = req.nextUrl.searchParams
  const page = await queryDamAssets(context.tenantId, {
    q: params.get("q") ?? undefined,
    type: (params.get("type") as DamAssetType | null) ?? null,
    folder: params.get("folder"),
    sort: (params.get("sort") as DamSort | null) ?? undefined,
    offset: Number(params.get("offset")) || 0,
  })
  return NextResponse.json(page)
}
