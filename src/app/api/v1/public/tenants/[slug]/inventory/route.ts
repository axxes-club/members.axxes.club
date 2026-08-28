import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants, products } from "@/lib/db/schema";
import { and, eq, desc, isNull } from "drizzle-orm";

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
