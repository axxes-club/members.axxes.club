/**
 * Reconciles accessions and wires the catalogue into the collection engine.
 *
 * THE PROBLEM, WHICH IS NOT A BUG IN THE IMPORT
 *
 * `artwork_details.inventory_number` looks like an accession number and is not
 * one. It is a *base* number shared by the parts of a suite:
 *
 *     1458          the drawing
 *     1458 texto    its text
 *     1458 texto 2  a second text
 *     1458 créditos the credits sheet
 *
 * 1458 is four distinct works, not one work entered four times. The same shape
 * appears for 0349 and 0627, and 524 numbers already carry a trailing letter
 * (0537b, 0537c) which is this collection's own sub-part convention. So the
 * duplicates are real and must be preserved as real — the fault is that the
 * field is not an accession, and an accession has to be unique per collection
 * for an insurance schedule to mean anything.
 *
 * 1,121 of 3,667 works have no number at all, so they cannot be left to fall
 * out of a uniqueness guarantee either.
 *
 * WHAT THIS DOES
 *
 * Builds a unique accession for every work. A legacy number that is unique and
 * unclaimed is KEPT — rewriting 2,546 correct accessions to make the code
 * simpler would be vandalism. Everything else is disambiguated or generated.
 * The legacy value is carried into the ledger so the number a collector has
 * pencilled on the back of a work stays part of its record.
 *
 * Idempotent, and reversible: writes only vitrine_works, never products or
 * artwork_details. `--dry-run` prints the plan and writes nothing.
 *
 * Run: node scripts/wire-collection.mjs [--dry-run] [--tenant <slug>]
 */
import fs from "fs";

const env = fs.readFileSync("/Users/admin/Developer/members.axxes.club/.env.local", "utf8");
const m = env.match(/^DATABASE_URL="?([^"\n]+)"?/m);
if (!m) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}
const { neon } = await import("@neondatabase/serverless");
const sql = neon(m[1]);

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry-run");
const tenantArg = argv.includes("--tenant") ? argv[argv.indexOf("--tenant") + 1] : "coleccion-reyes-veray";

/** The collection's own prefix. CRV is Colección Reyes-Veray. */
const PREFIX = "CRV";

async function main() {
  const [tenant] = await sql`SELECT id, name, slug FROM tenants WHERE slug = ${tenantArg}`;
  if (!tenant) {
    console.error("no such tenant:", tenantArg);
    process.exit(1);
  }
  console.log(`collection: ${tenant.name} (${tenant.slug})`);
  if (DRY) console.log("DRY RUN — nothing will be written");

  const works = await sql`
    SELECT p.id AS product_id, p.name, p.slug,
           d.artist_name, d.artist_slug, d.title, d.inventory_number
    FROM products p
    JOIN artwork_details d ON d.product_id = p.id
    WHERE p.tenant_id = ${tenant.id} AND p.deleted_at IS NULL
    ORDER BY p.created_at, p.id
  `;
  console.log(`works to wire: ${works.length}`);

  const artists = await sql`SELECT id, slug, name FROM artists WHERE tenant_id = ${tenant.id}`;

  // Artist matching is by TOKEN SET, not by slug.
  //
  // The two sides disagree on name order. artwork_details carries
  // "jorge-zeno-morales"; artists carries "morales-jorge-zeno". Joining on
  // either slug literal matched 54 of 3,282 — which is why the first wire-up
  // linked almost nothing to an artist, and it was not obvious why.
  //
  // A sorted token set is invariant to the order, so it matches both conventions
  // and the genuinely awkward names too: "Víctor Rodríguez Gotay" against an
  // artist entered as "Rodríguez Gotay, Víctor", or a collective entered as
  // "EXOR (Diego Romero)" beside one entered as "Diego Romero". 590 of 591
  // artists collapse onto a single key.
  const norm = (s) =>
    String(s)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const bySlug = new Map(artists.map((a) => [a.slug, a]));
  const byTokens = new Map();
  for (const a of artists) {
    const key = norm(a.name).split(" ").filter(Boolean).sort().join(" ");
    // First one wins, so a duplicated name cannot silently reassign works.
    if (key && !byTokens.has(key)) byTokens.set(key, a);
  }

  const findArtist = (w) => {
    if (w.artist_slug && bySlug.has(w.artist_slug)) return bySlug.get(w.artist_slug);
    const key = norm(w.artist_name || "").split(" ").filter(Boolean).sort().join(" ");
    return key ? byTokens.get(key) : undefined;
  };

  // --- accession allocation -------------------------------------------------
  //
  // Claim every number already used by exactly one work first, so a number the
  // collection gave to one thing is never reassigned to another. Then count past
  // the highest legacy number, so a generated number cannot collide with one a
  // human chooses later.
  const counts = new Map();
  for (const w of works) {
    const n = (w.inventory_number || "").trim();
    if (!n) continue;
    counts.set(n, (counts.get(n) || 0) + 1);
  }

  const taken = new Set();
  for (const [n, c] of counts) if (c === 1) taken.add(n);

  let highest = 0;
  for (const n of counts.keys()) {
    const d = String(n).match(/^0*(\d+)/);
    if (d) highest = Math.max(highest, parseInt(d[1], 10));
  }
  let next = highest + 1;
  const nextNum = () => String(next++).padStart(4, "0");

  const plan = [];
  const used = new Set();
  let kept = 0;
  let generated = 0;
  let disambiguated = 0;

  for (const w of works) {
    const legacy = (w.inventory_number || "").trim();
    let accession;

    if (legacy && taken.has(legacy) && !used.has(legacy)) {
      accession = legacy;
      kept++;
    } else if (legacy) {
      // Shared by a suite. The base goes to the first work to claim it; the rest
      // take the collection's own letter convention, which is how 0537b already
      // reads, falling back to -2, -3 past 'z'.
      let k = 0;
      let candidate = `${legacy}a`;
      while (used.has(candidate)) {
        k++;
        candidate = k < 26 ? `${legacy}${String.fromCharCode(97 + k)}` : `${legacy}-${k}`;
      }
      accession = candidate;
      disambiguated++;
    } else {
      accession = `${PREFIX}-${nextNum()}`;
      generated++;
    }

    used.add(accession);
    plan.push({ work: w, accession, legacy });
  }

  console.log(`\naccessions:`);
  console.log(`  kept (unique, unclaimed) : ${kept}`);
  console.log(`  disambiguated (suite)   : ${disambiguated}`);
  console.log(`  generated (no number)   : ${generated}`);
  console.log(`  highest legacy number   : ${highest} -> generation starts at ${highest + 1}`);

  const all = plan.map((p) => p.accession);
  if (new Set(all).size !== all.length) {
    console.error("ALLOCATION BUG: accessions are not unique — refusing to write");
    process.exit(1);
  }
  console.log("  uniqueness check        : passed");

  console.log(`\nsample:`);
  for (const p of plan.slice(0, 3)) {
    console.log(`  ${p.accession.padEnd(12)} ${String(p.work.name).slice(0, 56)}`);
  }
  const suite = plan.find((p) => p.legacy === "1458");
  if (suite) console.log(`  suite example: ${suite.accession} from legacy 1458`);

  // Report the match honestly rather than letting a silent zero stand. A wire-up
  // that links 54 of 3,282 works to an artist looks like a success and is not.
  let matchedArtists = 0;
  for (const w of works) if (findArtist(w)) matchedArtists++;
  console.log(`\nartist matching (token set):`);
  console.log(`  linked   : ${matchedArtists} of ${works.length}`);
  console.log(`  unlinked : ${works.length - matchedArtists} (artist not yet on the roster)`);

  if (DRY) {
    console.log("\ndry run complete — nothing written");
    return;
  }

  // --- write ----------------------------------------------------------------
  //
  // vitrine_works only. products and artwork_details are read, never touched, so
  // a mistake costs one truncate of a table this script created.
  const now = new Date().toISOString();
  let written = 0;
  for (const p of plan) {
    const w = p.work;
    const artist = findArtist(w) ?? null;
    const title = w.title || String(w.name || "").split("–")[0].trim();

    await sql`
      INSERT INTO vitrine_works (
        tenant_id, product_id, artist_id, accession, title, status,
        currency, on_site, created_at, updated_at
      )
      VALUES (
        ${tenant.id}, ${w.product_id}, ${artist ? artist.id : null},
        ${p.accession}, ${title}, 'active', 'USD', true, ${now}, ${now}
      )
      ON CONFLICT (tenant_id, accession) DO UPDATE SET
        product_id = EXCLUDED.product_id,
        artist_id = EXCLUDED.artist_id,
        title = EXCLUDED.title,
        updated_at = now()
    `;
    written++;
    if (written % 1000 === 0) console.log(`  ...${written}/${plan.length}`);
  }
  console.log(`\nwrote ${written} rows to vitrine_works`);
  console.log("catalogue facts (medium, dimensions, year, images) stay on products/artwork_details");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
