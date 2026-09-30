#!/usr/bin/env node
// Fails the build if the portal's DDL and the product's Drizzle schema disagree.
//
// The suite convention is that db/<product>.sql is the original and the product
// copies it — which is a convention, not a mechanism, and a convention that is
// enforced only by remembering produces exactly what happened here: three
// interleaved CREATE TABLE bodies in one file that still passed a read-through.
//
// This compares the two on the things that actually matter — the table list, the
// column list per table, and the index list — and treats the DDL as the source
// of truth, because that is what apply-binnacle.mjs runs.
//
// Column names are compared after normalising camelCase to snake_case, because
// that difference is the naming convention rather than drift.

import { readFileSync } from "node:fs"

const DDL = "/Users/admin/Developer/members.axxes.club/db/binnacle.sql"
const SCHEMA = "/Users/admin/Developer/binnacle.axxes.club/src/lib/db/schema/binnacle.ts"

const snake = (s) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase())

const ddl = readFileSync(DDL, "utf8")
const schema = readFileSync(SCHEMA, "utf8")

// --- the statement splitter, shared with apply-binnacle.mjs -----------------
// Duplicated deliberately rather than imported: this script must be runnable
// before the apply script has ever run, and a checker that needs a working
// install to check the install is a checker that gets skipped.
function splitStatements(source) {
  const out = []
  let cur = "", line = false, block = false, str = false
  for (let i = 0; i < source.length; i++) {
    const ch = source[i], nx = source[i + 1]
    if (line) { if (ch === "\n") line = false; continue }
    if (block) { if (ch === "*" && nx === "/") { block = false; i++ } continue }
    if (str) { cur += ch; if (ch === "'") { if (nx === "'") { cur += nx; i++ } else str = false } continue }
    if (ch === "-" && nx === "-") { line = true; i++; continue }
    if (ch === "/" && nx === "*") { block = true; i++; continue }
    if (ch === "'") { str = true; cur += ch; continue }
    if (ch === ";") { const t = cur.trim(); if (t) out.push(t); cur = ""; continue }
    cur += ch
  }
  const tail = cur.trim(); if (tail) out.push(tail)
  if (str) throw new Error("DDL ended inside a string literal — unbalanced quote")
  return out
}

const problems = []

// 1. The DDL must split into statements, none of them fragments.
const statements = splitStatements(ddl)
const tables = statements.filter((s) => /^CREATE TABLE IF NOT EXISTS/i.test(s))
const indexes = statements.filter((s) => /^CREATE (UNIQUE )?INDEX/i.test(s))
const fragments = statements.filter((s) => !/^CREATE (TABLE|UNIQUE INDEX|INDEX)/i.test(s))
if (fragments.length) {
  for (const f of fragments) problems.push(`DDL statement is a fragment: ${JSON.stringify(f.slice(0, 70))}`)
}

// 2. Same table list.
const ddlTables = new Set(tables.map((t) => t.match(/CREATE TABLE IF NOT EXISTS (\w+)/i)[1]))
const schemaTables = new Set(
  [...schema.matchAll(/pgTable\(\s*\n?\s*"(\w+)"/g)].map((m) => m[1]),
)
for (const t of ddlTables) if (!schemaTables.has(t)) problems.push(`${t}: in the DDL but not in the schema`)
for (const t of schemaTables) if (!ddlTables.has(t)) problems.push(`${t}: in the schema but not in the DDL`)

// 3. Same columns per table.
const ddlCols = {}
for (const m of ddl.matchAll(/CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*?)\n\);/g)) {
  ddlCols[m[1]] = new Set(
    [...m[2].matchAll(/^\s{2}(\w+)\s+(?:uuid|text|integer|boolean|timestamptz|jsonb|text\[\])/gm)].map((c) => c[1]),
  )
}
const schemaCols = {}
for (const block of schema.split(/export const binnacle\w+ = pgTable\(/).slice(1)) {
  const t = block.match(/^\s*"(\w+)"/)[1]
  schemaCols[t] = new Set(
    [...block.matchAll(/^\s{4}(\w+):\s*(?:uuid|text|integer|boolean|timestamp|jsonb)\(/gm)].map((c) => snake(c[1])),
  )
}
for (const [t, cols] of Object.entries(ddlCols)) {
  const other = schemaCols[t]
  if (!other) continue
  for (const c of cols) if (!other.has(c)) problems.push(`${t}.${c}: in the DDL but not in the schema`)
  for (const c of other) if (!cols.has(c)) problems.push(`${t}.${c}: in the schema but not in the DDL`)
}

// 4. Same indexes, by name.
const ddlIdx = new Set([...ddl.matchAll(/CREATE (?:UNIQUE )?INDEX IF NOT EXISTS (\w+)/g)].map((m) => m[1]))
const schemaIdx = new Set([...schema.matchAll(/(?:unique)?[Ii]ndex\("(\w+)"\)/g)].map((m) => m[1]))
for (const i of ddlIdx) if (!schemaIdx.has(i)) problems.push(`index ${i}: in the DDL but not in the schema`)
for (const i of schemaIdx) if (!ddlIdx.has(i)) problems.push(`index ${i}: in the schema but not in the DDL`)

if (problems.length) {
  console.error(`check-binnacle-ddl: ${problems.length} problem(s)`)
  for (const p of problems) console.error("  " + p)
  process.exit(1)
}
console.log(
  `check-binnacle-ddl: ${ddlTables.size} tables, ${ddlIdx.size} indexes, ${statements.length} statements — DDL and schema agree`,
)
