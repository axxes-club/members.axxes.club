import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants, websiteSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
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