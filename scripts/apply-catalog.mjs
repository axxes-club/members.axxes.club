#!/usr/bin/env node
// Applies db/axxes-products.sql to the shared AXXES database.
//
// The catalog file is the single source of truth for what AXXES offers, so
// applying it must be exact and must be able to run repeatedly.
//
// THE SPLITTER IS THE INTERESTING PART.
//
// Splitting on ";" is wrong twice over in this file:
//
//   1. Comment lines contain semicolons, so splitting inside a comment yields
//      a fragment that is not valid SQL.
//   2. String literals contain semicolons — Vibez's description really does
//      read "...a night-flash camera; every photo lands on a live feed" — so
//      splitting inside a literal cuts a value in half and Postgres reports an
//      unterminated quoted string. That is the exact error this replaced.
//
// So this tracks state: inside a line comment, inside a block comment, or
// inside a single-quoted string. Only a semicolon at depth zero, outside all
// three, ends a statement. That is the minimum needed to be correct against
// this file, and it is deliberately not a general SQL parser.
//
// It also verifies that applying the file did not disturb any pre-existing row,
// because this catalog is read by the launcher, by Handshake's OIDC registry
// and by lanes' suite registry. A silent edit to a product nobody is working on
// is precisely the drift the table exists to prevent.
//
// Run with:  node scripts/apply-catalog.mjs

import { createRequire } from "node:module"
import { readFileSync } from "node:fs"

const require = createRequire("/Users/admin/Developer/members.axxes.club/package.json")
const { neon } = require("@neondatabase/serverless")

const env = readFileSync("/Users/admin/Developer/members.axxes.club/.env.local", "utf8")
const url = env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "")
if (!url) throw new Error("No DATABASE_URL in members.axxes.club/.env.local")

const sql = neon(url)
const file = "/Users/admin/Developer/members.axxes.club/db/axxes-products.sql"
const ddl = readFileSync(file, "utf8")

/** Splits a SQL script into statements, respecting comments and string literals. */
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
      if (ch === "*" && next === "/") {
        inBlockComment = false
        i++
      }
      continue
    }
    if (inString) {
      current += ch
      // A doubled '' inside a literal is an escaped quote, not the end of it.
      if (ch === "'") {
        if (next === "'") {
          current += next
          i++
        } else {
          inString = false
        }
      }
      continue
    }

    if (ch === "-" && next === "-") {
      inLineComment = true
      i++
      continue
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true
      i++
      continue
    }
    if (ch === "'") {
      inString = true
      current += ch
      continue
    }
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
  return statements
}

const statements = splitStatements(ddl)

// This is a data file, not a schema. Only the statements that touch data are
// applied, and the script says so rather than quietly running whatever DDL the
// file happens to contain.
const dataStatements = statements.filter((s) => /^insert/i.test(s))
if (dataStatements.length === 0) {
  console.error("No INSERT statements found in the catalog file — refusing to run.")
  process.exit(1)
}
console.log(`Split into ${statements.length} statements, applying ${dataStatements.length} INSERT(s)`)

async function main() {
  const before = await sql`select key, name, status, category, surface_in_members
                            from axxes_product order by key`
  const beforeByKey = new Map(before.map((r) => [r.key, r]))

  for (const stmt of dataStatements) await sql.query(stmt)

  const after = await sql`select key, name, status, category, surface_in_members
                           from axxes_product order by key`

  const added = after.filter((r) => !beforeByKey.has(r.key)).map((r) => r.key)
  const changed = after
    .filter((r) => {
      const was = beforeByKey.get(r.key)
      return was && JSON.stringify(was) !== JSON.stringify(r)
    })
    .map((r) => r.key)
  const removed = before.filter((r) => !after.some((a) => a.key === r.key)).map((r) => r.key)

  console.log(`\nrows: ${before.length} -> ${after.length}`)
  console.log(`added:   ${added.length ? added.join(", ") : "none"}`)
  console.log(`changed: ${changed.length ? changed.join(", ") : "none"}`)
  console.log(`removed: ${removed.length ? removed.join(", ") : "none"}`)

  if (removed.length) {
    console.error(
      "\nA row disappeared. The brand doc is explicit that a product is never deleted.",
    )
    process.exit(1)
  }

  const keel = after.find((r) => r.key === "keel")
  if (keel) {
    console.log(
      `\nkeel: status=${keel.status} category=${keel.category} visible=${keel.surface_in_members}`,
    )
    if (keel.surface_in_members) {
      console.error("Keel is not deployed; surface_in_members must be false.")
      process.exit(1)
    }
  }
}

main().catch((e) => {
  console.error("FAILED:", e.message)
  process.exit(1)
})
