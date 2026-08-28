import { db } from "../src/lib/db";
import { products } from "../src/lib/db/schema";
import { eq, isNull, and, sql } from "drizzle-orm";

async function main() {
  const schema = await import("../src/lib/db/schema");
  const tenant = await db.query.tenants.findFirst({ where: eq(schema.tenants.slug, "coleccion-reyes-veray") });
  if (!tenant) { console.log("NO TENANT"); process.exit(0); }
  console.log("TENANT:", tenant.name, tenant.slug, "email:", tenant.email, "status:", tenant.status);
  const pages = await db.select().from(schema.pages).where(eq(schema.pages.tenantId, tenant.id));
  console.log("PAGES:", pages.length, pages.map(p => p.slug).join(","));
  if (pages[0]) console.log("PAGE SAMPLE:", JSON.stringify(pages[0]).slice(0, 300));
  const ws = await db.select().from(schema.websiteSettings).where(eq(schema.websiteSettings.tenantId, tenant.id));
  console.log("WEBSITE_SETTINGS:", ws.length, JSON.stringify(ws[0] || {}).slice(0, 300));
  const cats = await db.select().from(schema.productCategories).where(eq(schema.productCategories.tenantId, tenant.id));
  console.log("CATEGORIES:", cats.length, cats.slice(0,5).map(c => c.name).join(","));
  const stats = await db.select({ status: products.status, count: sql<number>`count(*)` }).from(products).where(and(eq(products.tenantId, tenant.id), isNull(products.deletedAt))).groupBy(products.status);
  console.log("PRODUCTS BY STATUS:", JSON.stringify(stats));
  const featured = await db.select().from(products).where(and(eq(products.tenantId, tenant.id), eq(products.isFeatured, true), isNull(products.deletedAt))).limit(5);
  console.log("FEATURED:", featured.length, featured.map(f => f.name).join(" | "));
  const sample = await db.select().from(products).where(and(eq(products.tenantId, tenant.id), isNull(products.deletedAt))).limit(2);
  console.log("SAMPLE TAGS:", JSON.stringify(sample.map(s => s.tags)));
  console.log("SAMPLE META:", JSON.stringify(sample.map(s => s.metadata)).slice(0, 400));
  console.log("SAMPLE SEO:", JSON.stringify(sample.map(s => [s.metaTitle, s.metaDescription])));
  process.exit(0);
}
main();
