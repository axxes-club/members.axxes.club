/**
 * Moves the Education Municipal accounts from @bayamon.pr.gov to @bayamonpr.gov.
 *
 * The department's real mail domain has no dot in it, and the dotted form was
 * an assumption on our side rather than anything the office asked for. Every
 * address in the space follows one convention, so the odd one out is the wrong
 * one.
 *
 *   node scripts/rename-bayamon-emails.mjs           # dry run, changes nothing
 *   node scripts/rename-bayamon-emails.mjs --apply   # write
 *
 * The rename touches user.email only. Credential accounts key off user.id
 * (account.account_id is the user id, not the address), so signing in is
 * unaffected, and no other table in the database stores these addresses.
 *
 * An address is skipped when a *different* user already holds the target. Two
 * rows sharing an address is worse than a wrong domain: sign-in looks the user
 * up by email, so the duplicate can hand a session to the wrong account. Those
 * cases are reported, never forced.
 */
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { neon } from "@neondatabase/serverless"

const HERE = dirname(fileURLToPath(import.meta.url))
const APPLY = process.argv.includes("--apply")
const TENANT_ID = "1655ea4c-d5dd-4905-a5b9-a61fc6b7cd4d"
const FROM = "@bayamon.pr.gov"
const TO = "@bayamonpr.gov"

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

const members = await sql`
  select u.id, u.name, u.email
  from tenant_memberships m
  join "user" u on u.id = m.user_id
  where m.tenant_id = ${TENANT_ID}
    and m.deleted_at is null
    and lower(u.email) like ${"%" + FROM}
  order by u.email
`

console.log(`Members of the Education Municipal space with a ${FROM} address: ${members.length}\n`)

let renamed = 0
const blocked = []

for (const person of members) {
  const target = person.email.replace(new RegExp(FROM + "$", "i"), TO)

  const holder = await sql`select id, name from "user" where lower(email) = lower(${target})`
  const taken = holder.find((h) => h.id !== person.id)

  if (taken) {
    blocked.push({
      person,
      target,
      heldBy: taken,
    })
    console.log(
      `[skip]  ${person.email}\n` +
        `        -> ${target} is already held by a different user ` +
        `(${taken.name}, ${taken.id})`,
    )
    continue
  }

  if (APPLY) {
    await sql`update "user" set email = ${target}, updated_at = now() where id = ${person.id}`
  }
  renamed++
  console.log(`[${APPLY ? "renamed" : "dry-run"}] ${person.email} -> ${target}  (${person.name})`)
}

console.log(
  `\n${APPLY ? "DONE" : "DRY RUN"}: ${renamed} address(es) moved, ${blocked.length} left alone.`,
)

if (blocked.length) {
  console.log("\nLeft alone, and why:")
  for (const b of blocked) {
    console.log(
      `  ${b.person.email} (${b.person.name}) could not move: ` +
        `${b.target} belongs to ${b.heldBy.name}, who is not in this space.`,
    )
  }
  console.log(
    "\nThese two rows are the same person. Decide which account survives, then\n" +
      "one of them can be retired so the address is free.",
  )
}
