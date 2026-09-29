#!/usr/bin/env node
// Applies db/keel.sql to the shared AXXES database.
//
// Keel follows the suite convention: the portal owns the schema and a product
// app runs no migrations of its own, so this lives here rather than in the
// product repo. The file is all CREATE ... IF NOT EXISTS, so running it twice
// is a no-op and it is safe to re-run after an edit.
//
// Naive splitting on ';' is not enough: the file's comments contain semicolons,
// and splitting inside a comment produces a fragment that is not valid SQL. So
// full-line comments are stripped before the statements are split. There are no
// semicolons inside string literals in this file; the one place a comment could
// legally appear mid-line is avoided by only stripping lines that are entirely
// a comment, which keeps the intent readable in the file itself.

import { createRequire } from "node:module"
import { readFileSync } from "node:fs"

const PORTAL = "/Users/admin/Developer/members.axxes.club/package.json"
const require = createRequire(PORTAL)
const { neon } = require("@neondatabase/serverless")

const env = readFileSync("/Users/admin/Developer/members.axxes.club/.env.local", "utf8")
const url = env
  .match(/^DATABASE_URL=(.*)$/m)?.[1]
  ?.trim()
  .replace(/^["']|["']$/g, "")
if (!url) throw new Error("No DATABASE_URL in members.axxes.club/.env.local")

const sql = neon(url)
const ddl = readFileSync("/Users/admin/Developer/members.axxes.club/db/keel.sql", "utf8")

const stripped = ddl
  .split("\n")
  .filter((line) => !/^\s*--/.test(line))
  .join("\n")

const statements = stripped
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean)

const TABLES = ["keel_repos", "keel_blobs", "keel_checkpoints", "keel_entries", "keel_undone"]

async function main() {
  for (const stmt of statements) {
    await sql.query(stmt)
  }
  console.log(`Applied ${statements.length} statements`)

  for (const t of TABLES) {
    const rows = await sql.query(`select count(*)::int as n from ${t}`)
    console.log(`  ${t.padEnd(20)} ok, ${rows[0].n} rows`)
  }
}

main().catch((e) => {
  console.error("FAILED:", e.message)
  process.exit(1)
})
