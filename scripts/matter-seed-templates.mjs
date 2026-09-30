/**
 * Seeds the two matter templates.
 *
 * Idempotent: ON CONFLICT DO UPDATE, so re-running refreshes the copy in every
 * environment and a wording change does not need a migration.
 *
 * This is the "one engine, two templates" decision made concrete. Both rows
 * drive the same wizard, the same tables and the same screens. What differs is
 * the vocabulary offered, the roles pre-filled, and the dates a new matter
 * opens with. Nothing downstream branches on which one was used — which is the
 * point, and the reason the business template can be hidden or sold on its own
 * later without touching the engine.
 */
import fs from "node:fs"
import path from "node:path"
import { neon } from "@neondatabase/serverless"

function loadEnv(file) {
  try {
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const t = line.trim()
      if (!t || t.startsWith("#")) continue
      const i = t.indexOf("=")
      if (i === -1) continue
      if (process.env[t.slice(0, i)] === undefined) {
        process.env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, "")
      }
    }
  } catch {}
}

const root = path.resolve(import.meta.dirname, "..")
loadEnv(path.join(root, ".env.local"))
loadEnv(path.join(root, ".env.development.local"))

const sql = neon(process.env.DATABASE_URL)

const templates = [
  {
    key: "family",
    name: "Family succession",
    blurb: "A will, a trust, or an estate being settled — with the family and the lawyers in one place.",
    description:
      "For a family settling a deceased relative's affairs. Sets up the roles a probate actually turns on — executor, heirs, counsel — and the dates that have to be met whether or not anybody is ready. Documents carry an acknowledgement, so 'I have seen this' stops being a claim and becomes a record.",
    icon: "Users",
    sortOrder: 1,
    kinds: [
      { key: "probate", label: "Probate" },
      { key: "will", label: "Will" },
      { key: "trust", label: "Trust" },
      { key: "property", label: "Property" },
    ],
    defaultRoles: [
      { role: "executor", label: "Executor" },
      { role: "heir", label: "Heir" },
      { role: "counsel", label: "Family lawyer" },
      { role: "notary", label: "Notary" },
    ],
    defaultDeadlines: [
      { title: "Secure and inventory property and accounts", kind: "review", offsetDays: 7 },
      { title: "Order certified copies of the death certificate", kind: "filing", offsetDays: 14 },
      { title: "First meeting with counsel", kind: "court", offsetDays: 21 },
      { title: "File the will with the court", kind: "filing", offsetDays: 45 },
    ],
  },
  {
    key: "business",
    name: "Business succession",
    blurb: "A venue, a label or a promoter passing a business to the next generation or a buyer.",
    description:
      "For owners handing a business to family or selling it out. Same engine as a family matter, different vocabulary: owners and co-owners instead of heirs, valuation and buyout dates instead of probate filings. Built for the operator already running on AXXES who cannot let a hand-over happen in a group chat.",
    icon: "Briefcase",
    sortOrder: 2,
    kinds: [
      { key: "business", label: "Business hand-over" },
      { key: "buyout", label: "Buyout" },
      { key: "shareholder", label: "Shareholder agreement" },
    ],
    defaultRoles: [
      { role: "owner", label: "Owner" },
      { role: "co_owner", label: "Co-owner" },
      { role: "counsel", label: "Business lawyer" },
      { role: "accountant", label: "Accountant" },
    ],
    defaultDeadlines: [
      { title: "Agree the basis of valuation", kind: "valuation", offsetDays: 10 },
      { title: "Assemble the last three years of accounts", kind: "review", offsetDays: 20 },
      { title: "Draft the buyout or hand-over terms", kind: "court", offsetDays: 35 },
      { title: "Review with counsel", kind: "court", offsetDays: 50 },
      { title: "Sign and close", kind: "tax", offsetDays: 75 },
    ],
  },
]

for (const t of templates) {
  await sql.query(
    `insert into matter_templates
       (key, name, blurb, description, kinds, default_roles, default_deadlines, icon, sort_order)
     values ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9)
     on conflict (key) do update set
       name = excluded.name, blurb = excluded.blurb, description = excluded.description,
       kinds = excluded.kinds, default_roles = excluded.default_roles,
       default_deadlines = excluded.default_deadlines, icon = excluded.icon,
       sort_order = excluded.sort_order`,
    [t.key, t.name, t.blurb, t.description, JSON.stringify(t.kinds), JSON.stringify(t.defaultRoles), JSON.stringify(t.defaultDeadlines), t.icon, t.sortOrder],
  )
  console.log(`  seeded ${t.key} — ${t.name}`)
}

const rows = await sql.query(`select key, name, jsonb_array_length(kinds) as kinds, jsonb_array_length(default_deadlines) as dates from matter_templates order by sort_order`)
console.log("\ntemplates now in the database:")
for (const r of rows) console.log(`  ${r.key.padEnd(9)} ${r.name.padEnd(22)} ${r.kinds} kinds, ${r.dates} dates`)
