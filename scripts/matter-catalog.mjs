/**
 * Registers Matter in the product catalog (axxes_product).
 *
 * `key` is the primary key, referenced by developer.axxes.club's plan catalog,
 * Handshake's OIDC clients and lanes' suite registry. Set once, never renamed.
 *
 * `members_path` is the switch between the two surfaces and it is the only
 * difference between them:
 *
 *   '/matters'  the tile opens Matter INSIDE the portal, no new tab
 *   NULL        the tile goes to the standalone app on its own domain
 *
 * Both surfaces read and write the same tables, so either can be the product.
 * Setting it to NULL is the honest default now that matter.axxes.club exists:
 * one product, one URL, and the portal copy becomes a convenience rather than
 * the product itself.
 *
 * Idempotent.
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
const sql = neon(process.env.DATABASE_URL)

const hide = process.argv.includes("--hide")
const embed = process.argv.includes("--embed")

await sql.query(
  `insert into axxes_product
     (key, name, tagline, description, url, color, category, status, sso, icon, members_path, surface_in_members, sort_order)
   values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
   on conflict (key) do update set
     name = excluded.name, tagline = excluded.tagline, description = excluded.description,
     url = excluded.url, status = excluded.status, sso = excluded.sso, icon = excluded.icon,
     members_path = excluded.members_path,
     surface_in_members = excluded.surface_in_members,
     sort_order = excluded.sort_order, updated_at = now()`,
  [
    "matter", "Matter",
    "Succession, with a record of who agreed",
    "One case for a family estate or a business hand-over: the documents, the dates, the people, and an acknowledgement on every version of every document — so 'I have seen this' stops being a claim and becomes a record.",
    "https://matter.axxes.club", "#c9a227", "Work", "beta", true, "Scale",
    embed ? "/matters" : null,
    !hide, 7,
  ],
)

const rows = await sql.query(`select key, name, url, status, surface_in_members, members_path from axxes_product where key='matter'`)
console.log("catalog row:", JSON.stringify(rows[0], null, 2))
console.log(hide ? "\ntile hidden (--hide)" : "\ntile visible in the Apps launcher")
console.log(embed ? "opens inside the portal (--embed)" : "opens matter.axxes.club (standalone)")
