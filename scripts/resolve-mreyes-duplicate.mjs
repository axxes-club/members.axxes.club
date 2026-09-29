/**
 * Two accounts exist for María Reyes and only one of them is hers.
 *
 *   mreyes@bayamon.pr.gov   ADMIN, a member of the Bayamón space, 12 sessions
 *   mreyes@bayamonpr.gov    GENERAL, in no space at all, 2 sessions
 *
 * Both are the same person: the second row was created when she signed in
 * with the address we were renaming everyone TO, before the rename ran, so
 * Better Auth found no user and made a new one. That duplicate is what stops
 * rename-bayamon-emails.mjs from finishing: the target address is taken.
 *
 * The admin row is the real one. It is the account with the role, the
 * membership and almost all the sign-ins, and the department has been using it.
 * The stray row is in no organization, so it cannot see any Krates data and
 * cannot be the account anyone has been working in.
 *
 * This script frees the address by retiring the stray row, so the rename can
 * then move the admin row onto it. The stray row is not erased: its id,
 * password hash and sign-in history are kept, and its sessions are ended so
 * the duplicate cannot be signed into while the rename is pending.
 *
 *   node scripts/resolve-mreyes-duplicate.mjs           # dry run, changes nothing
 *   node scripts/resolve-mreyes-duplicate.mjs --apply   # write
 */
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { neon } from "@neondatabase/serverless"

const HERE = dirname(fileURLToPath(import.meta.url))
const APPLY = process.argv.includes("--apply")

const TENANT_ID = "1655ea4c-d5dd-4905-a5b9-a61fc6b7cd4d"
const KEEP_EMAIL = "mreyes@bayamon.pr.gov" // the admin, and the row that survives
const FREE_EMAIL = "mreyes@bayamonpr.gov" // the stray duplicate, to be retired

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const env = readFileSync(join(HERE, "..", ".env.local"), "utf8")
  for (const line of env.split("\n")) {
    if (line.startsWith("DATABASE_URL=")) {
      return line
        .slice("DATABASE_URL=".length)
        .trim()
        .replace(/^["']|["']$/g, "")
        .replace(/\\n$/, "")
    }
  }
  throw new Error("DATABASE_URL not set and not found in .env.local")
}

const sql = neon(databaseUrl())

const keep = await sql`
  select u.id, u.email, u.name, u.role, u.is_superadmin
  from "user" u
  where lower(u.email) = lower(${KEEP_EMAIL})
`
if (keep.length !== 1) {
  throw new Error(`Expected exactly one ${KEEP_EMAIL} row, found ${keep.length}.`)
}
const keeper = keep[0]

const stray = await sql`
  select u.id, u.email, u.name, u.role
  from "user" u
  where lower(u.email) = lower(${FREE_EMAIL})
`
if (stray.length !== 1) {
  throw new Error(`Expected exactly one ${FREE_EMAIL} row, found ${stray.length}.`)
}
const duplicate = stray[0]

if (duplicate.id === keeper.id) {
  throw new Error("Both rows are the same user; nothing to resolve.")
}

// The keeper must really be the one in the space, and the duplicate must not be.
const keeperIn = await sql`
  select 1 from tenant_memberships
  where user_id = ${keeper.id} and tenant_id = ${TENANT_ID} and deleted_at is null
`
const duplicateIn = await sql`
  select 1 from tenant_memberships
  where user_id = ${duplicate.id} and deleted_at is null
`
if (keeperIn.length === 0) {
  throw new Error(`${KEEP_EMAIL} is not in the Bayamón space; refusing to guess.`)
}
if (duplicateIn.length > 0) {
  throw new Error(
    `${FREE_EMAIL} belongs to ${duplicateIn.length} organization(s); refusing to retire it.`,
  )
}

console.log(`Keeping   ${keeper.email}  (${keeper.role}, in the space)  ${keeper.id}`)
console.log(`Retiring  ${duplicate.email}  (${duplicate.role}, in no space)  ${duplicate.id}\n`)

if (!APPLY) {
  console.log("DRY RUN. Nothing was written. Re-run with --apply to retire the duplicate.")
  process.exit(0)
}

// Both writes go in one transaction, so the duplicate is never left signed-in
// against a half-finished state: either its sessions end and its address is
// parked, or nothing changes.
const [endedSessions, retiredRow] = await sql.transaction([
  // End the duplicate's sessions so the retired address cannot be signed into
  // in the window before the keeper's row is moved onto it.
  sql`
    delete from session where user_id = ${duplicate.id}
    returning id
  `,
  // Park the address rather than freeing it outright: the row is kept, with
  // its id and password hash, so nothing about the account is lost. The
  // address is left free of any real user so the rename can claim it.
  sql`
    update "user"
    set email = ${`retired-duplicate-${duplicate.id}@invalid.local`},
        updated_at = now()
    where id = ${duplicate.id}
    returning id
  `,
])

console.log(`Ended ${endedSessions.length} session(s) held by the duplicate.`)
if (retiredRow.length !== 1) {
  throw new Error("The duplicate row was not updated; nothing was retired.")
}
console.log(`Retired row parked at retired-duplicate-${duplicate.id}@invalid.local.`)

console.log("\nDONE. The address mreyes@bayamonpr.gov is now free.")
console.log("Next: node scripts/rename-bayamon-emails.mjs --apply")
