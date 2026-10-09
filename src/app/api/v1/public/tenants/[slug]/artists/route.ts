import {wrapAdmission} from '@/lib/security/admission-server';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants, artists } from "@/lib/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";

/**
 * Public artist index for a tenant.
 *
 * Query params:
 *   ?slug=<slug>   a single artist
 *   ?fields=slugs  just the slugs (static generation / sitemaps)
 *   ?q=<term>      substring search over name and bio
 */
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

    const url = new URL(request.url);
    const artistSlug = url.searchParams.get("slug");
    const fields = url.searchParams.get("fields");
    const q = url.searchParams.get("q")?.trim();

    const conditions = [eq(artists.tenantId, tenant.id)];
    if (artistSlug) conditions.push(eq(artists.slug, artistSlug));
    if (q) {
      conditions.push(
        sql`(${artists.name} ILIKE ${`%${q}%`} OR ${artists.bio} ILIKE ${`%${q}%`})`
      );
    }

    if (fields === "slugs") {
      const rows = await db
        .select({ slug: artists.slug })
        .from(artists)
        .where(and(...conditions))
        .orderBy(asc(artists.sortName));
      return NextResponse.json(rows.map((r) => r.slug).filter(Boolean));
    }

    const rows = await db
      .select({
        id: artists.id,
        slug: artists.slug,
        name: artists.name,
        bio: artists.bio,
        lifespan: artists.lifespan,
        artworkCount: artists.artworkCount,
      })
      .from(artists)
      .where(and(...conditions))
      .orderBy(asc(artists.sortName), asc(artists.name));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Public API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const GET=wrapAdmission(GETHandler,'src/app/api/v1/public/tenants/[slug]/artists/route.ts'+':GET',12000);
