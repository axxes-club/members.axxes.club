import { NextResponse } from "next/server"
import { requireTenantAccess } from "@/lib/auth/tenant-context"
import { queryDamOverview } from "@/lib/dam/queries"

export async function GET() {
  const context = await requireTenantAccess().catch(() => null)
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json(await queryDamOverview(context.tenantId))
}
