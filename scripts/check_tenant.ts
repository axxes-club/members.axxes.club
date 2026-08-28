import { db } from "../src/lib/db";
import { products } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const t = await db.query.tenants.findFirst();
  const tenant = await db.query.tenants.findFirst({ where: eq((await import("../src/lib/db/schema")).tenants.slug, "coleccion-reyes-veray") });
  if (!tenant) { console.log("TENANT: MISSING"); process.exit(0); }
  const prods = await db.select().from(products).where(eq(products.tenantId, tenant.id));
  console.log("TENANT:", tenant.slug, "| PRODUCTS:", prods.length);
  if (prods[0]) console.log("first:", prods[0].name, "| images:", JSON.stringify(prods[0].images).slice(0, 150));
  process.exit(0);
}
main();
