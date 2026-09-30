/**
 * Applies db/matters.sql.
 *
 * Why this exists instead of `psql -f`: the Neon serverless driver used by this
 * portal (`@neondatabase/serverless`, neon-http) sends ONE statement per request
 * and has no transaction support. `psql` is also often not installed on a
 * developer machine, and the portal already talks to the database only through
 * the driver in src/lib/db.
 *
 * So the file is split on statement boundaries and each statement is sent on
 * its own. That is also what makes `ALTER TYPE ... ADD VALUE` legal here: it
 * cannot run inside a transaction block, and this runner never opens one.
 *
 * The SQL is written to be idempotent (every statement is IF NOT EXISTS, and
 * the enum values are added inside a DO block that checks first), so running it
 * twice is a no-op rather than an error.
 *
 *   node scripts/matter-migrate.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { neon } from "@neondatabase/serverless"

function loadEnv(file) {
  try {
    const text = fs.readFileSync(file, "utf8")
    for (const line of text.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const i = trimmed.indexOf("=")
      if (i === -1) continue
      const key = trimmed.slice(0, i)
      let value = trimmed.slice(i + 1).replace(/^["']|["']$/g, "")
      if (process.env[key] === undefined) process.env[key] = value
    }
  } catch {
    // .env.development.local is optional; .env.local is the one that matters.
  }
}

const root = path.resolve(import.meta.dirname, "..")
loadEnv(path.join(root, ".env.local"))
loadEnv(path.join(root, ".env.development.local"))

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Cannot migrate.")
  process.exit(1)
}

const sqlFile = path.join(root, "db", "matters.sql")
const raw = fs.readFileSync(sqlFile, "utf8")

/**
 * Split on semicolons that are not inside a string, a dollar-quoted block or a
 * line comment. Matters.sql uses `$$ ... $$` for the enum guard, so a naive
 * split on `;` would cut that block in half and send garbage.
 */
function splitStatements(sql) {
  const out = []
  let buf = ""
  let inSingle = false
  let inDollar = false
  let inLineComment = false

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]
    const next = sql[i + 1]

    if (inLineComment) {
      if (ch === "\n") inLineComment = false
      buf += ch
      continue
    }
    if (!inSingle && !inDollar && ch === "-" && next === "-") {
      inLineComment = true
      buf += ch
      continue
    }
    if (!inDollar && ch === "'") {
      inSingle = !inSingle
      buf += ch
      continue
    }
    if (!inSingle && ch === "$" && next === "$") {
      inDollar = !inDollar
      buf += ch
      i++
      buf += next
      continue
    }
    if (ch === ";" && !inSingle && !inDollar) {
      out.push(buf.trim())
      buf = ""
      continue
    }
    buf += ch
  }
  if (buf.trim()) out.push(buf.trim())
  // Statements that are only comments carry no SQL.
  return out.filter((s) => s.replace(/--[^\n]*/g, "").trim().length > 0)
}

const statements = splitStatements(raw)
console.log(`matters.sql → ${statements.length} statements\n`)

const sql = neon(process.env.DATABASE_URL)
let applied = 0
for (const statement of statements) {
  const label = statement.replace(/--[^\n]*/g, "").trim().split("\n")[0].slice(0, 68)
  try {
    await sql.query(statement)
    applied++
    console.log(`  ok   ${label}`)
  } catch (error) {
    console.error(`  FAIL ${label}`)
    console.error(`       ${error.message}`)
    process.exit(1)
  }
}

console.log(`\napplied ${applied}/${statements.length}`)

const tables = await sql.query(
  `select table_name from information_schema.tables
   where table_schema = 'public' and table_name like 'matter%' order by table_name`,
)
console.log("matter tables now present:", tables.map((r) => r.table_name).join(", "))
