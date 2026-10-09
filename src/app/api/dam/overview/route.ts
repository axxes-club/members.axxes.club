import {wrapAdmission} from '@/lib/security/admission-server';
import { NextResponse } from "next/server"
import { requireTenantAccess } from "@/lib/auth/tenant-context"
import { queryDamOverview } from "@/lib/dam/queries"

async function GETHandler() {
  const context = await requireTenantAccess().catch(() => null)
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json(await queryDamOverview(context.tenantId))
}

export const GET=wrapAdmission(GETHandler,'src/app/api/dam/overview/route.ts'+':GET',12000);
