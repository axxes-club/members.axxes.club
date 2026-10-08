import {wrapAdmission} from '@/lib/security/admission-server';
import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { requireTenantAccess } from "@/lib/auth/tenant-context"
import { db } from "@/lib/db"
import { uploadSessions } from "@/lib/db/schema"

// Polled by the phone-handoff dialog; a route (not a server action) so polling doesn't block other actions
async function GETHandler(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const context = await requireTenantAccess().catch(() => null)
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { token } = await params
  const [session] = await db
    .select()
    .from(uploadSessions)
    .where(and(eq(uploadSessions.token, token), eq(uploadSessions.tenantId, context.tenantId)))
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    photos: session.photos ?? [],
    expiresAt: session.expiresAt.toISOString(),
    expired: session.expiresAt.getTime() < Date.now(),
  })
}

export const GET=wrapAdmission(GETHandler,'src/app/api/dam/upload-sessions/[token]/route.ts'+':GET',12000);
