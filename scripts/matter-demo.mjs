/**
 * Mock data for trying Matter locally.
 *
 * Writes real rows into the real (shared) database, scoped to ONE tenant —
 * "AXXES CLUB" — so it can be seen in the portal without touching anybody
 * else's data. Everything it creates is tagged with a `demo-` prefix so
 * `--clean` can find and remove exactly what it added, and nothing else.
 *
 * It DOES write to the shared database. LOCAL-TESTING.md already warns that a
 * local session is a real session; this script is the same thing with a
 * narrower blast radius. Run `--clean` when you are done looking.
 *
 *   node scripts/matter-demo.mjs          seed
 *   node scripts/matter-demo.mjs --clean  remove everything it created
 *
 * A note on the names: everyone here is fictional, including the lawyer and the
 * notary. A demo that used a real firm's name would be a small misrepresentation
 * sitting in a shared database forever.
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
const OWNER_EMAIL = "viscasillas@me.com"
const TENANT_NAME = "AXXES CLUB"
const TAG = "demo-"

const clean = process.argv.includes("--clean")

if (clean) {
  // Acks first: they reference documents, and matter_acks has no cascade from
  // the tenant on its own — it does, but being explicit here keeps the order
  // obvious to whoever reads this next.
  // The Neon serverless driver resolves to the row array directly — there is no
  // { rows } envelope, which is the pg/Postgres.js shape. Getting this wrong
  // fails on `.map`, long after the delete has already run.
  const ids = (await sql.query(
    `select m.id from matters m join tenants t on t.id = m.tenant_id
     where t.name = $1 and m.title like $2`,
    [TENANT_NAME, `${TAG}%`],
  )).map((r) => r.id)
  if (!ids.length) {
    console.log("nothing to clean")
  } else {
    await sql.query(`delete from matters where id = any($1::uuid[])`, [ids])
    console.log(`removed ${ids.length} demo matter(s) and everything under them`)
  }
  process.exit(0)
}

const [owner] = await sql.query(`select id, name from "user" where email = $1`, [OWNER_EMAIL])
if (!owner) {
  console.error(`No user ${OWNER_EMAIL}. Sign in once locally, then re-run.`)
  process.exit(1)
}

const [tenant] = await sql.query(`select id from tenants where name = $1`, [TENANT_NAME])
if (!tenant) {
  console.error(`No tenant named "${TENANT_NAME}". Change TENANT_NAME at the top of this script.`)
  process.exit(1)
}
const tenantId = tenant.id

const day = 24 * 60 * 60 * 1000
const fromNow = (d) => new Date(Date.now() + d * day)

// ── Matter 1: family, with a document that has a real argument in its history.
// `returning id` also resolves to the row array directly, so this destructures
// the first row rather than reaching for a `.rows` envelope.
const [family] = await sql.query(
  `insert into matters (tenant_id, created_by_id, template_key, kind, title, summary, stage, jurisdiction, opened_at)
   values ($1,$2,'family','probate',$3,$4,'reviewing','Puerto Rico', $5)
   returning id`,
  [
    tenantId, owner.id,
    `${TAG}Estate of Carmen Reyes-Veray`,
    "Settling the estate. Two adult children, one property in Santurce, and a will that at least one of them has not read.",
    new Date(Date.now() - 30 * day),
  ],
)

await sql.query(
  `insert into matter_participants (matter_id, tenant_id, user_id, actor_key, display_name, role, org)
   values
     ($1,$2,$3,$4,$5,'executor', null),
     ($1,$2,null,$6,$7,'heir', null),
     ($1,$2,null,$8,$9,'heir', null),
     ($1,$2,null,$10,$11,'counsel', 'Vega & Associates'),
     ($1,$2,null,$12,$13,'notary', null)`,
  [
    family.id, tenantId, owner.id, `user:${owner.id}`, owner.name ?? "Jose",
    "guest:rosa", "Rosa Reyes",
    "guest:angel", "Ángel Reyes",
    "guest:lombardi", "Dr. Mariana Lombardi",
    "guest:notary", "Ramón Vázquez",
  ],
)

// The argument: v1 approved by the executor, objected to by an heir, v2
// approved, and a v3 that nobody has looked at yet. This is the exact shape
// the ledger exists to make visible.
const [doc] = await sql.query(
  `insert into matter_documents (matter_id, tenant_id, title, kind, revision, status, purpose, created_by_id)
   values ($1,$2,'Last will and testament','asset',3,'in_review','Names the executor and leaves the Santurce house to Rosa.',$3)
   returning id`,
  [family.id, tenantId, owner.id],
)

await sql.query(
  `insert into matter_acks (document_id, matter_id, revision, actor_key, actor_name, actor_role, decision, note, decided_at)
   values
     ($1,$2,1,'user:' || $3,$4,'executor','approved','First draft read and agreed.', $5),
     ($1,$2,1,'guest:rosa','Rosa Reyes','heir','viewed', null, $6),
     ($1,$2,1,'guest:lombardi','Dr. Mariana Lombardi','counsel','changes_requested','Clause 7 names Ángel as executor. Carmen changed that in 2023 and the draft never caught up.', $7),
     ($1,$2,2,'user:' || $3,$4,'executor','approved','Clause 7 corrected to Rosa.', $8),
     ($1,$2,2,'guest:rosa','Rosa Reyes','heir','approved','Read the correction, thank you.', $9),
     ($1,$2,2,'guest:lombardi','Dr. Mariana Lombardi','counsel','approved', null, $9)`,
  [
    doc.id, family.id, owner.id, owner.name ?? "Jose",
    new Date(Date.now() - 21 * day),
    new Date(Date.now() - 20 * day),
    new Date(Date.now() - 14 * day),
    new Date(Date.now() - 9 * day),
    new Date(Date.now() - 2 * day),
  ],
)

const [deed] = await sql.query(
  `insert into matter_documents (matter_id, tenant_id, title, kind, revision, status, purpose)
   values ($1,$2,'Deed — 14 Calle Aguada','asset',1,'draft','Proves ownership of the house nobody has disputed yet.')
   returning id`,
  [family.id, tenantId],
)
await sql.query(
  `insert into matter_acks (document_id, matter_id, revision, actor_key, actor_name, actor_role, decision, decided_at)
   values ($1,$2,1,'guest:lombardi','Dr. Mariana Lombardi','counsel','viewed', $3)`,
  [deed.id, family.id, new Date(Date.now() - 1 * day)],
)

await sql.query(
  `insert into matter_deadlines (matter_id, tenant_id, title, kind, due_at, actor_key, actor_name)
   values
     ($1,$2,'File the will with the court','filing',$3,'guest:lombardi','Dr. Mariana Lombardi'),
     ($1,$2,'Notary appointment — house deed','notary',$4,'guest:notary','Ramón Vázquez'),
     ($1,$2,'Beneficiary meeting with Ángel','court',$5,'user:' || $6,$7)`,
  [
    family.id, tenantId,
    fromNow(6), fromNow(13), fromNow(20), owner.id, owner.name ?? "Jose",
  ],
)

await sql.query(
  `insert into matter_tasks (matter_id, tenant_id, title, detail, actor_key, actor_name, status, due_at)
   values
     ($1,$2,'Order three certified death certificates','Registraría charges twelve dollars each.','guest:lombardi','Dr. Mariana Lombardi','open',$3),
     ($1,$2,'Get Ángel a copy of the 2023 amendment','He has asked twice.','guest:rosa','Rosa Reyes','done',$4),
     ($1,$2,'Pull twelve months of bank statements','Santurce branch only.','guest:lombardi','Dr. Mariana Lombardi','open',$5)`,
  // The fee is spelled out because "$12" inside this SQL reads as a bind
  // placeholder to Postgres, and the parameter count then stops lining up.
  [family.id, tenantId, fromNow(4), new Date(Date.now() - 5 * day), fromNow(9)],
)

// ── Matter 2: business, to prove the second template runs on the same engine.
const [biz] = await sql.query(
  `insert into matters (tenant_id, created_by_id, template_key, kind, title, summary, stage, jurisdiction, opened_at)
   values ($1,$2,'business','buyout',$3,$4,'collecting', null, $5)
   returning id`,
  [
    tenantId, owner.id,
    `${TAG}Buyout — Calle Norte venue`,
    "Two co-owners, one valuation that neither trusts, and a deadline neither set.",
    new Date(Date.now() - 10 * day),
  ],
)

await sql.query(
  `insert into matter_participants (matter_id, tenant_id, user_id, actor_key, display_name, role)
   values
     ($1,$2,$3,$4,$5,'owner'),
     ($1,$2,null,$6,$7,'co_owner'),
     ($1,$2,null,$8,$9,'counsel')`,
  [
    biz.id, tenantId, owner.id, `user:${owner.id}`, owner.name ?? "Jose",
    "guest:mateo", "Mateo Ferrer",
    "guest:cruz", "Lic. Isabel Cruz",
  ],
)

const [sha] = await sql.query(
  `insert into matter_documents (matter_id, tenant_id, title, kind, revision, status, purpose)
   values ($1,$2,'Valuation report — Calle Norte','asset',1,'in_review','Independent valuation both sides are meant to accept.')
   returning id`,
  [biz.id, tenantId],
)
await sql.query(
  `insert into matter_acks (document_id, matter_id, revision, actor_key, actor_name, actor_role, decision, note, decided_at)
   values ($1,$2,1,'guest:mateo','Mateo Ferrer','co_owner','changes_requested','The rent roll stops at March. The last three quarters are the whole argument.', $3)`,
  [sha.id, biz.id, new Date(Date.now() - 3 * day)],
)

await sql.query(
  `insert into matter_tasks (matter_id, tenant_id, title, actor_key, actor_name, status, due_at)
   values ($1,$2,'Commission an independent valuation','guest:cruz','Lic. Isabel Cruz','open',$3),
          ($1,$2,'Assemble the last three years of accounts','guest:mateo','Mateo Ferrer','open',$4)`,
  [biz.id, tenantId, fromNow(7), fromNow(14)],
)

const FAMILY_TITLE = `${TAG}Estate of Carmen Reyes-Veray`
const BUSINESS_TITLE = `${TAG}Buyout — Calle Norte venue`

console.log("seeded two demo matters in", TENANT_NAME)
console.log(`  ${FAMILY_TITLE}`)
console.log(`  ${BUSINESS_TITLE}`)
console.log("\nopen http://localhost:3111/matters")
console.log("remove with: node scripts/matter-demo.mjs --clean")
