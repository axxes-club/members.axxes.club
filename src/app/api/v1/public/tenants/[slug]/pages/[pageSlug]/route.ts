import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants, pages, pageBlocks } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; pageSlug: string }> }
) {
  try {
    const { slug, pageSlug } = await params;
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const page = await db.query.pages.findFirst({
      where: and(
        eq(pages.tenantId, tenant.id),
        eq(pages.slug, pageSlug),
        eq(pages.isPublished, true)
      ),
      with: {
        blocks: {
          orderBy: [asc(pageBlocks.sortOrder)],
        },
      },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error("Public API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}