import {wrapAdmission} from '@/lib/security/admission-server';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants, pages, pageBlocks } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";

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

    const publishedPages = await db.query.pages.findMany({
      where: and(eq(pages.tenantId, tenant.id), eq(pages.isPublished, true)),
      orderBy: [asc(pages.sortOrder)],
      with: {
        blocks: {
          orderBy: [asc(pageBlocks.sortOrder)],
        },
      },
    });

    return NextResponse.json(publishedPages);
  } catch (error) {
    console.error("Public API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const GET=wrapAdmission(GETHandler,'src/app/api/v1/public/tenants/[slug]/pages/route.ts'+':GET',12000);
