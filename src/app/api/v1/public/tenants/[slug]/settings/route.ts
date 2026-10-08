import {wrapAdmission} from '@/lib/security/admission-server';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants, websiteSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function GETHandler(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const settings = await db.query.websiteSettings.findFirst({
      where: eq(websiteSettings.tenantId, tenant.id),
    });

    return NextResponse.json({
      tenant: {
        name: tenant.name,
        slug: tenant.slug,
        email: tenant.email,
      },
      settings: settings || null,
    });
  } catch (error) {
    console.error("Public API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const GET=wrapAdmission(GETHandler,'src/app/api/v1/public/tenants/[slug]/settings/route.ts'+':GET',12000);
