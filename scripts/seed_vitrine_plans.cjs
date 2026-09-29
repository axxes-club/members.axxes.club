/**
 * Adds the two collector plans for Vitrine.
 *
 * Vitrine sits in `scale` ($299/mo) today, which is a platform price for
 * companies reselling AXXES to their own customers, not a price a collector
 * pays to keep their own records. Collectors buy the thing, not a suite.
 *
 * Two tiers, both collector-priced and both containing nothing but Vitrine, so
 * they can sit beside the Lanes/Nexus plans without disturbing them:
 *
 *   collector      $99/mo   the desk: catalog, provenance, condition, exports
 *   collector-pro  $199/mo  the desk, plus assisted cataloguing (the OCR/vision
 *                          pass that reads an old catalogue, a wall label or a
 *                          condition report and proposes a record)
 *
 * Idempotent: keyed on plans.key, so re-running updates rather than duplicates.
 * Nothing is deleted — `scale` keeps vitrine, because an existing scale
 * subscriber must not lose access to a product they already pay for.
 *
 * Run: node scripts/seed_vitrine_plans.cjs
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

/**
 * Naming note, deliberate and not a placeholder.
 *
 * The capability is real work — reading a document and proposing a record — but
 * the desk's whole argument with a registrar is that the record is defensible.
 * Leading with "AI" invites the question "how do I audit it", which is the wrong
 * first question. So the tier is named for the work, not the mechanism.
 */
const PLANS = [
  {
    key: "collector",
    name: "Collector",
    blurb: "One collection, properly kept.",
    price_cents: 9900,
    annual_price_cents: 99000,
    max_apps: 1,
    products: ["vitrine"],
    features: [
      "Unlimited works in one collection",
      "Provenance, condition and exhibition history per work",
      "Artist index with biographies",
      "Exports to CSV and JSON",
      "Invited registrars and viewers",
    ],
    position: 3,
  },
  {
    key: "collector-pro",
    name: "Collector Pro",
    blurb: "The desk, plus an assistant that reads what you already have.",
    price_cents: 19900,
    annual_price_cents: 199000,
    max_apps: 1,
    products: ["vitrine"],
    features: [
      "Everything in Collector",
      "Assisted cataloguing — propose a record from a catalogue, wall label or condition report",
      "Review before anything is written; nothing saves without a human",
      "Duplicate and near-duplicate detection across your own records",
      "Priority support",
    ],
    position: 4,
  },
];

async function main() {
  const before = await sql`SELECT key, price_cents, position FROM plans ORDER BY position`;
  console.log("plans before:", JSON.stringify(before));

  for (const p of PLANS) {
    const rows = await sql`
      INSERT INTO plans (key, name, blurb, price_cents, annual_price_cents, max_apps,
                         products, features, position, updated_at)
      VALUES (${p.key}, ${p.name}, ${p.blurb}, ${p.price_cents}, ${p.annual_price_cents},
              ${p.max_apps}, ${JSON.stringify(p.products)}::jsonb, ${JSON.stringify(p.features)}::jsonb,
              ${p.position}, now())
      ON CONFLICT (key) DO UPDATE SET
        name = EXCLUDED.name,
        blurb = EXCLUDED.blurb,
        price_cents = EXCLUDED.price_cents,
        annual_price_cents = EXCLUDED.annual_price_cents,
        max_apps = EXCLUDED.max_apps,
        products = EXCLUDED.products,
        features = EXCLUDED.features,
        position = EXCLUDED.position,
        updated_at = now()
    `;
    console.log(`upserted ${p.key} (${rows.length} row)`);
  }

  const after = await sql`
    SELECT key, name, price_cents, max_apps, position, products
    FROM plans ORDER BY position
  `;
  for (const r of after) {
    const prods = Array.isArray(r.products) ? r.products.join(",") : JSON.stringify(r.products);
    console.log(
      `  [${r.position}] ${r.key.padEnd(14)} $${(r.price_cents / 100).toString().padStart(6)}/mo  apps=${String(r.max_apps).padEnd(4)} ${prods}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
