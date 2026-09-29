/**
 * Creates the Bayamón Department of Education staff accounts and attaches them
 * to the "Educacion Municipal - Ciudad de Bayamon" tenant.
 *
 * The roster comes from the department's own ODT, which lists a username and a
 * password per person. Passwords are hashed with Better Auth's own hasher --
 * the same call the sign-in path verifies against -- so a plaintext password
 * never touches the database.
 *
 *   node scripts/import-bayamon-staff.mjs           # dry run, changes nothing
 *   node scripts/import-bayamon-staff.mjs --apply   # writes
 */
import fs from "node:fs"
import path from "node:path"
import { neon } from "@neondatabase/serverless"
import { hashPassword } from "better-auth/crypto"
import { nanoid } from "nanoid"

const args = process.argv.slice(2)
const APPLY = args.includes("--apply")
const TENANT_ID = "1655ea4c-d5dd-4905-a5b9-a61fc6b7cd4d"
const DOMAIN = "bayamon.pr.gov"
const DEPARTMENT = "EDUCACION"
const ROSTER = args.find((a) => !a.startsWith("--")) || "/tmp/pdfimg/roster.json"

const env = fs.readFileSync(
  path.join(import.meta.dirname, "..", ".env.local"),
  "utf8",
)
const databaseUrl = env
  .match(/^DATABASE_URL=(.*)$/m)[1]
  .trim()
  .replace(/^["']|["']$/g, "")
  .replace(/\\n$/, "")
const sql = neon(databaseUrl)

const roster = JSON.parse(fs.readFileSync(ROSTER, "utf8"))

/** A name with no username still deserves an address that will not be reused. */
function slug(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
}

const plans = []
const seenEmails = new Map()
for (const person of roster) {
  const { name, user, pass } = person
  const hasLogin = Boolean(user && pass)
  const email = hasLogin ? `${user.toLowerCase()}@${DOMAIN}` : `${slug(name)}@${DOMAIN}`

  if (seenEmails.has(email)) {
    plans.push({ name, email, hasLogin, skip: `duplicate address ${email} (already used by ${seenEmails.get(email)})` })
    continue
  }
  seenEmails.set(email, name)
  plans.push({ name, email, hasLogin, pass, skip: null })
}

const existing = await sql`
  select email from "user" where lower(email) = any(${plans.map((p) => p.email)})
`
const taken = new Set(existing.map((r) => r.email.toLowerCase()))

let created = 0
let noLogin = 0
let skipped = 0

for (const plan of plans) {
  if (plan.skip) {
    console.log(`[skip]  ${plan.name} -- ${plan.skip}`)
    skipped++
    continue
  }
  if (taken.has(plan.email)) {
    console.log(`[skip]  ${plan.name} -- ${plan.email} already exists`)
    skipped++
    continue
  }

  const userId = nanoid(27)
  if (APPLY) {
    await sql`
      insert into "user" (id, name, email, email_verified, is_superadmin, role, department, locale)
      values (${userId}, ${plan.name}, ${plan.email}, true, false, 'GENERAL', ${DEPARTMENT}, 'es')
    `
    if (plan.hasLogin) {
      await sql`
        insert into account (id, account_id, provider_id, user_id, password)
        values (${nanoid(27)}, ${userId}, 'credential', ${userId}, ${await hashPassword(plan.pass)})
      `
    }
    await sql`
      insert into tenant_memberships (tenant_id, user_id, role, permissions, is_primary)
      values (${TENANT_ID}, ${userId}, 'member', '[]'::jsonb, true)
    `
  }

  if (plan.hasLogin) created++
  else noLogin++
  console.log(
    `[${APPLY ? "create" : "dry-run"}] ${plan.name} -> ${plan.email}` +
      (plan.hasLogin ? " (login)" : " (person only, no credentials supplied)"),
  )
}

console.log(
  `\n${APPLY ? "DONE" : "DRY RUN"}: ${created} with sign-in, ${noLogin} without, ${skipped} skipped.`,
)
