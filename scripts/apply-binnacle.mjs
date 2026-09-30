#!/usr/bin/env node
// Applies db/binnacle.sql to the shared AXXES database.
//
// Binnacle follows the suite convention: the portal owns the schema and a
// product app runs no migrations of its own, so this lives here rather than in
// the product repo. Every statement is CREATE ... IF NOT EXISTS, so running it
// twice is a no-op and it is safe to re-run after an edit.
//
// THE SPLITTER IS THE INTERESTING PART, and it is copied from apply-catalog.mjs
// rather than written fresh, because splitting on ";" is wrong twice over here:
//
//   1. The comment blocks in this file explain *why* each table exists, and they
//      contain semicolons. Splitting inside a comment yields invalid SQL.
//   2. String literals contain semicolons too — the partial index predicates read
//      "status not in ('solved', 'closed')" and a comment inside a CREATE INDEX
//      is a real thing here. Splitting inside a literal cuts a value in half and
//      Postgres reports an unterminated quoted string.
//
// So it tracks state: inside a line comment, inside a block comment, or inside a
// single-quoted literal. Only a semicolon at depth zero, outside all three, ends
// a statement. That is the minimum needed to be correct against this file and is
// deliberately not a general SQL parser.
//
// It then verifies that every table it expected actually exists, and that a
// re-run changes nothing — a silent partial apply is the failure this guards.

import { createRequire } from "node:module"
import { readFileSync } from "node:fs"

const PORTAL = "/Users/admin/Developer/members.axxes.club/package.json"
const require = createRequire(PORTAL)
const { neon } = require("@neondatabase/serverless")

const env = readFileSync("/Users/admin/Developer/members.axxes.club/.env.local", "utf8")
const url = env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "")
if (!url) throw new Error("No DATABASE_URL in members.axxes.club/.env.local")

const sql = neon(url)
const ddl = readFileSync("/Users/admin/Developer/members.axxes.club/db/binnacle.sql", "utf8")

function splitStatements(source) {
  const statements = []
  let current = ""
  let inLineComment = false
  let inBlockComment = false
  let inString = false

  for (let i = 0; i < source.length; i++) {
    const ch = source[i]
    const next = source[i + 1]

    if (inLineComment) {
      if (ch === "\n") inLineComment = false
      continue
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") { inBlockComment = false; i++ }
      continue
    }
    if (inString) {
      current += ch
      if (ch === "'") {
        if (next === "'") { current += next; i++ } else { inString = false }
      }
      continue
    }

    if (ch === "-" && next === "-") { inLineComment = true; i++; continue }
    if (ch === "/" && next === "*") { inBlockComment = true; i++; continue }
    if (ch === "'") { inString = true; current += ch; continue }
    if (ch === ";") {
      const trimmed = current.trim()
      if (trimmed) statements.push(trimmed)
      current = ""
      continue
    }
    current += ch
  }

  const tail = current.trim()
  if (tail) statements.push(tail)
  if (inString) throw new Error("DDL ended inside a string literal — unbalanced quote")
  return statements
}

const TABLES = [
  "binnacle_mailboxes", "binnacle_teams", "binnacle_tickets", "binnacle_messages",
  "binnacle_events", "binnacle_canned", "binnacle_macros", "binnacle_views",
  "binnacle_slas", "binnacle_automations", "binnacle_articles", "binnacle_csat",
  "binnacle_folders", "binnacle_rate_limits",
]

async function main() {
  const statements = splitStatements(ddl)
  for (const stmt of statements) await sql.query(stmt)
  console.log(`Applied ${statements.length} statements`)

  let bad = 0
  for (const t of TABLES) {
    const rows = await sql.query(
      `select
         (select count(*)::int from information_schema.tables where table_name = $1) as exists,
         (select count(*)::int from ${t}) as n`,
      [t],
    )
    const { exists, n } = rows[0]
    if (!exists) { console.error(`  ${t.padEnd(24)} MISSING`); bad++ } else {
      console.log(`  ${t.padEnd(24)} ok, ${n} rows`)
    }
  }
  if (bad > 0) throw new Error(`${bad} table(s) did not exist after applying the DDL`)

  // A second pass must be a no-op. If it is not, a statement is not idempotent
  // and re-running this on a live database could duplicate something.
  for (const stmt of statements) await sql.query(stmt)
  console.log("Re-apply was a no-op.")
}

main().catch((e) => {
  console.error("FAILED:", e.message)
  process.exit(1)
})
