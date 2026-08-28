import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants, products } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

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

    const inventory = await db.query.products.findMany({
      where: eq(products.tenantId, tenant.id),
      orderBy: [desc(products.createdAt)],
    });

    return NextResponse.json(inventory);
  } catch (error) {
    console.error("Public API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
