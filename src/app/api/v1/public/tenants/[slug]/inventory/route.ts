import {wrapAdmission} from '@/lib/security/admission-server';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants, products } from "@/lib/db/schema";
import { and, eq, desc, isNull } from "drizzle-orm";

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

    // Query params: ?slug= (single product), ?featured=true, ?limit=n, ?fields=slugs
    const url = new URL(request.url);
    const productSlug = url.searchParams.get("slug");
    const featured = url.searchParams.get("featured") === "true";
    const fields = url.searchParams.get("fields");
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 0, 5000) : undefined;

    const conditions = [
      eq(products.tenantId, tenant.id),
      isNull(products.deletedAt),
      eq(products.status, "active"),
    ];
    if (productSlug) conditions.push(eq(products.slug, productSlug));
    if (featured) conditions.push(eq(products.isFeatured, true));

    // Slim mode: only slugs (for static generation / sitemaps)
    if (fields === "slugs") {
      const rows = await db
        .select({ slug: products.slug })
        .from(products)
        .where(and(...conditions));
      return NextResponse.json(rows.map((r) => r.slug).filter(Boolean));
    }

    // Artist-index mode: only what an artist page needs to list that artist's
    // works — the title prefix and one thumbnail. The full inventory payload is
    // ~8MB for this tenant, which exceeds Next.js's 2MB data-cache ceiling, so
    // it is re-fetched on every request and a 591-page build crawls. This shape
    // is small enough to cache and costs a few hundred KB for the whole
    // collection.
    if (fields === "artistIndex") {
      const rows = await db
        .select({
          slug: products.slug,
          name: products.name,
          image: products.images,
        })
        .from(products)
        .where(and(...conditions));

      return NextResponse.json(
        rows.map((r) => {
          const first = Array.isArray(r.image)
            ? r.image.find(
                (i) => i && typeof i === "object" && typeof i.url === "string"
              )?.url ?? null
            : null;
          return { slug: r.slug, title: r.name ?? "", image: first };
        })
      );
    }

    const inventory = await db.query.products.findMany({
      where: and(...conditions),
      orderBy: [desc(products.createdAt)],
      ...(limit ? { limit } : {}),
    });

    return NextResponse.json(inventory);
  } catch (error) {
    console.error("Public API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const GET=wrapAdmission(GETHandler,'src/app/api/v1/public/tenants/[slug]/inventory/route.ts'+':GET',12000);
