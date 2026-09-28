// Read-only audit of the coleccion-reyes-veray tenant in the shared AXXES Neon DB.
// Run: node scripts/audit_cr.cjs
const fs = require("fs");
const path = require("path");

const env = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
const m = env.match(/^DATABASE_URL="?([^"\n]+)"?/m);
if (!m) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}
const { neon } = require("@neondatabase/serverless");
const sql = neon(m[1]);

const TENANT = "coleccion-reyes-veray";

async function main() {
  const t = await sql`SELECT id, name, slug, type, status, email FROM tenants WHERE slug = ${TENANT}`;
  console.log("TENANT:", JSON.stringify(t, null, 1));
  if (!t.length) return;
  const id = t[0].id;

  const p = await sql`SELECT count(*)::int AS n, count(*) FILTER (WHERE status='active')::int AS active, count(*) FILTER (WHERE is_featured)::int AS featured, count(*) FILTER (WHERE images IS NOT NULL)::int AS with_img FROM products WHERE tenant_id = ${id}`;
  console.log("PRODUCTS:", JSON.stringify(p[0]));

  const pg = await sql`SELECT id, slug, title, is_published, sort_order FROM pages WHERE tenant_id = ${id} ORDER BY sort_order`;
  console.log("CMS PAGES:", pg.length, JSON.stringify(pg));

  const ws = await sql`SELECT subdomain, custom_domain, navigation_style, footer_style, footer_text, show_powered_by, default_og_image FROM website_settings WHERE tenant_id = ${id}`;
  console.log("WEBSITE SETTINGS:", JSON.stringify(ws));

  const c = await sql`SELECT id, email, first_name, type, lead_status, created_at FROM contacts WHERE tenant_id = ${id} ORDER BY created_at DESC LIMIT 10`;
  console.log("CRM CONTACTS:", c.length, JSON.stringify(c, null, 1));

  const a = await sql`SELECT count(*)::int AS n FROM assets WHERE tenant_id = ${id}`;
  console.log("DAM ASSETS:", JSON.stringify(a[0]));

  const g = await sql`SELECT slug, name, count(*)::int AS n FROM products WHERE tenant_id = ${id} AND slug LIKE 'glossary/%' GROUP BY slug, name ORDER BY n DESC LIMIT 5`;
  console.log("GLOSSARY-AS-PRODUCT rows:", JSON.stringify(g));

  const cats = await sql`SELECT name, slug FROM product_categories WHERE tenant_id = ${id}`;
  console.log("CATEGORIES:", JSON.stringify(cats));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
