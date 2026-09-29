/**
 * Colección Reyes-Veray: move the 591 artist biographies that were imported as
 * products (slug LIKE 'glossary/%') into a first-class `artists` table.
 *
 * The import conflated two things: artworks (which have images, and belong in
 * `products`) and artist biographies (which do not). This corrects that without
 * destroying anything — the biography text is carried across, not re-derived.
 *
 * The DDL is additive (CREATE TABLE IF NOT EXISTS) and the delete is scoped to
 * this tenant's glossary rows only. Running twice is a no-op.
 *
 * Run: node scripts/migrate_cr_artists.cjs
 */
const fs = require("fs");
const path = require("path");

const env = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
const m = env.match(/^DATABASE_URL="?([^"\n]+)"?/m);
if (!m) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}
const { neon } = require("@neondatabase/serverless");
const sql = neon(m[1]);

const TENANT = "coleccion-reyes-veray";

const DDL = `
CREATE TABLE IF NOT EXISTS artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  bio TEXT,
  lifespan TEXT,
  artwork_count INTEGER NOT NULL DEFAULT 0,
  sort_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS artists_tenant_slug_idx ON artists (tenant_id, slug);
CREATE INDEX IF NOT EXISTS artists_tenant_idx ON artists (tenant_id);
`;

/** "Ortiz, Luis Abraham – Colección Reyes Veray" -> "Luis Abraham Ortiz" */
function cleanName(raw) {
  const base = String(raw || "").split("–")[0].trim();
  if (base.includes(",")) {
    const [last, first] = base.split(",").map((s) => s.trim());
    return first ? `${first} ${last}`.replace(/\s+/g, " ") : last;
  }
  return base;
}

/** Strip the WordPress UI line the import captured at the top of each bio. */
const BIO_PREFIX = /^Pulse aquí para ver el listado de obras \/ Press here to go to artworks list\s*/;

/** Pull "(Aibonito, 1946)" out of the bio so the lifespan can be indexed. */
function extractLifespan(bio) {
  const m = String(bio || "").match(/\(([^)]*?\d{4}[^)]*)\)/);
  return m ? m[1].trim() : null;
}

async function main() {
  const t = await sql`SELECT id FROM tenants WHERE slug = ${TENANT}`;
  if (!t.length) {
    console.error("Tenant not found:", TENANT);
    process.exit(1);
  }
  const tenantId = t[0].id;

  for (const stmt of DDL.split(";").map((s) => s.trim()).filter(Boolean)) {
    await sql.query(stmt);
  }
  console.log("artists table ready");

  const gloss = await sql`
    SELECT id, slug, name, description FROM products
    WHERE tenant_id = ${tenantId} AND slug LIKE 'glossary/%'
    ORDER BY slug
  `;
  console.log("glossary products found:", gloss.length);

  if (gloss.length) {
    // Back up the rows verbatim before anything is deleted.
    const backupPath = path.join(__dirname, "..", "db", "backups", "crv-glossary-products.json");
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.writeFileSync(backupPath, JSON.stringify(gloss, null, 2));
    console.log("backup written:", backupPath);

    let inserted = 0;
    for (const g of gloss) {
      const slug = g.slug.replace(/^glossary\//, "");
      const bio = String(g.description || "").replace(BIO_PREFIX, "").trim();
      const name = cleanName(g.name);
      const lifespan = extractLifespan(bio);
      const sortName = name.replace(/^[^A-Za-z\u00C0-\u00FF]+/, "");
      const r = await sql`
        INSERT INTO artists (tenant_id, slug, name, bio, lifespan, sort_name, artwork_count)
        VALUES (${tenantId}, ${slug}, ${name}, ${bio}, ${lifespan}, ${sortName}, 0)
        ON CONFLICT (tenant_id, slug) DO UPDATE SET
          name = EXCLUDED.name,
          bio = EXCLUDED.bio,
          lifespan = EXCLUDED.lifespan,
          sort_name = EXCLUDED.sort_name,
          updated_at = now()
        RETURNING (xmax = 0) AS ins
      `;
      if (r[0].ins) inserted++;
    }
    console.log("artists upserted:", inserted);
  } else {
    console.log("no glossary products left; recomputing artwork counts only");
  }

  // Artwork titles are stored as "Surname, Firstname. 0125d - Coleccion..."
  // while the artist is "Firstname Surname", so the match has to be done on
  // the surname-first form.
  //
  // Done in JS rather than SQL because the two name orders differ, but applied
  // as one UPDATE: the original per-artist loop issued 591 sequential round
  // trips, and two concurrent runs of this script raced and lost the counts.
  const arts = await sql`
    SELECT id, name FROM artists WHERE tenant_id = ${tenantId}
  `;
  const prods = await sql`
    SELECT name FROM products
    WHERE tenant_id = ${tenantId} AND slug NOT LIKE 'glossary/%'
  `;

  const norm = (s) =>
    String(s)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  // "Ortiz, Luis Abraham" -> "ortiz luis abraham"
  const surnameFirst = (firstLast) => {
    const parts = norm(firstLast).split(" ").filter(Boolean);
    if (parts.length < 2) return norm(firstLast);
    const last = parts.pop();
    return `${last} ${parts.join(" ")}`;
  };

  const prodNorm = prods.map((p) => norm(String(p.name).split("\u2013")[0]));
  const counted = arts.map((a) => ({
    id: a.id,
    n: prodNorm.filter((pn) => pn.startsWith(surnameFirst(a.name))).length,
  }));

  if (counted.length) {
    await sql.query(
      `UPDATE artists AS a SET artwork_count = c.n, updated_at = now()
       FROM (SELECT * FROM unnest($1::uuid[], $2::int[]) AS t(id, n)) AS c
       WHERE a.id = c.id`,
      [counted.map((c) => c.id), counted.map((c) => c.n)]
    );
  }
  console.log(
    `artists with >=1 artwork: ${counted.filter((c) => c.n > 0).length} / ${counted.length}`
  );

  // Remove the (image-less) DAM rows that were created for the bios, using the
  // names captured before the products go away.
  const glossNames = gloss.map((g) => g.name);
  let orphanAssets = 0;
  for (const nm of glossNames) {
    const r = await sql`DELETE FROM assets WHERE tenant_id = ${tenantId} AND name = ${nm} RETURNING id`;
    orphanAssets += r.length;
  }
  console.log("stray glossary assets removed:", orphanAssets);

  const before = await sql`SELECT count(*)::int AS n FROM products WHERE tenant_id = ${tenantId}`;
  const removed = await sql`
    DELETE FROM products WHERE tenant_id = ${tenantId} AND slug LIKE 'glossary/%' RETURNING id
  `;
  const after = await sql`SELECT count(*)::int AS n FROM products WHERE tenant_id = ${tenantId}`;
  console.log(`products: ${before[0].n} -> ${after[0].n} (removed ${removed.length})`);

  const sample = await sql`
    SELECT slug, name, lifespan, artwork_count FROM artists
    WHERE tenant_id = ${tenantId} AND artwork_count > 0
    ORDER BY artwork_count DESC LIMIT 8
  `;
  console.log("sample artists:", JSON.stringify(sample, null, 1));

  const total = await sql`SELECT count(*)::int AS n FROM artists WHERE tenant_id = ${tenantId}`;
  console.log("artists total:", total[0].n);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
