import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants, products } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; productSlug: string }> }
) {
  try {
    const { slug, productSlug } = await params;
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const product = await db.query.products.findFirst({
      where: and(
        eq(products.tenantId, tenant.id),
        eq(products.slug, productSlug),
        isNull(products.deletedAt)
      ),
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Public API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}