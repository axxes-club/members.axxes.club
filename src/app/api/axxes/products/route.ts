import {wrapAdmission} from '@/lib/security/admission-server';
import { NextResponse } from "next/server"
import { asc, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { axxesProduct } from "@/lib/db/schema"
import { publicCatalogProduct } from "@/lib/public-catalog"

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" }

async function GETHandler() {
  const rows = await db.select({ key: axxesProduct.key, name: axxesProduct.name, description: axxesProduct.description, tagline: axxesProduct.tagline, url: axxesProduct.url, color: axxesProduct.color, status: axxesProduct.status, sso: axxesProduct.sso })
    .from(axxesProduct).where(inArray(axxesProduct.status, ["live", "beta"]))
    .orderBy(asc(axxesProduct.sortOrder), asc(axxesProduct.name))
  return NextResponse.json({ products: rows.map(publicCatalogProduct).filter(Boolean) }, { headers })
}

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers }) }

export const GET=wrapAdmission(GETHandler,'src/app/api/axxes/products/route.ts'+':GET',12000);
