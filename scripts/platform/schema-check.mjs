// Read only production metadata; apply the additive migration to a private, empty PostgreSQL fixture.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const require = createRequire(
    process.env.AXXES_TEST_DEPENDENCIES || import.meta.url,
  ),
  { Pool } = require("pg"),
  { PGlite } = require("@electric-sql/pglite");
const input = execFileSync(
  "gcloud",
  [
    "secrets",
    "versions",
    "access",
    "latest",
    "--secret=members-env",
    "--project=gravy-meta",
  ],
  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
);
let connection = input
  .split(/\r?\n/)
  .find((line) => /^DATABASE_URL=/.test(line))
  ?.slice("DATABASE_URL=".length)
  .trim();
if (!connection) throw Error("Database configuration unavailable.");
if (/^['"]/.test(connection)) connection = connection.slice(1, -1);
if (process.env.PLATFORM_SCHEMA_PROXY_PORT) {
  const port = Number(process.env.PLATFORM_SCHEMA_PROXY_PORT),
    url = new URL(connection);
  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    url.searchParams.get("host") !==
      "/cloudsql/gravy-meta:us-west1:axxes-prod-db"
  )
    throw Error("Invalid schema proxy configuration.");
  url.hostname = "127.0.0.1";
  url.port = String(port);
  url.searchParams.delete("host");
  url.searchParams.delete("sslmode");
  connection = url.href;
}
const pool = new Pool({
    connectionString: connection,
    max: 1,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  }),
  client = await pool.connect();
let columns, keys, enums;
try {
  await client.query("BEGIN READ ONLY");
  columns = (
    await client.query(
      `SELECT c.relname AS table_name,a.attname AS column_name,format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull AS required FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($1) AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum`,
      [["user", "tenants", "tenant_memberships", "tenant_invitations"]],
    )
  ).rows;
  keys = (
    await client.query(
      `SELECT c.relname AS table_name,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($1) AND k.contype IN ('p','u')`,
      [["user", "tenants", "tenant_memberships", "tenant_invitations"]],
    )
  ).rows;
  enums = (
    await client.query(
      `SELECT t.typname,array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS labels FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' GROUP BY t.typname`,
    )
  ).rows;
  await client.query("ROLLBACK");
} finally {
  client.release();
  await pool.end();
}
const quote = (v) => '"' + v.replaceAll('"', '""') + '"',
  literal = (v) => "'" + v.replaceAll("'", "''") + "'";
let schema = enums
  .map(
    (e) =>
      `CREATE TYPE ${quote(e.typname)} AS ENUM (${e.labels.map(literal).join(",")});`,
  )
  .join("\n");
for (const table of [
  "user",
  "tenants",
  "tenant_memberships",
  "tenant_invitations",
]) {
  const fields = columns.filter((c) => c.table_name === table);
  if (!fields.length)
    throw Error("Required production table missing: " + table);
  schema += `\nCREATE TABLE ${quote(table)} (${[...fields.map((c) => `${quote(c.column_name)} ${c.type}${c.required ? " NOT NULL" : ""}`), ...keys.filter((k) => k.table_name === table).map((k) => k.definition)].join(",")});`;
}
const migration = await readFile(
    new URL("../../db/platform-admin/001-policy.sql", import.meta.url),
    "utf8",
  ),
  db = new PGlite();
try {
  await db.exec(schema);
  await db.exec(migration);
  await db.exec(migration);
  const metadata = {
    observedAt: new Date().toISOString(),
    productionReadOnly: true,
    privateRowsRead: 0,
    snapshotTables: 4,
    snapshotColumns: columns.length,
    schemaHash: createHash("sha256").update(schema).digest("hex"),
    migrationHash: createHash("sha256").update(migration).digest("hex"),
    migrationAppliedToEmptyFixture: true,
    idempotent: true,
    limits:
      "Core columns and primary/unique constraints preserved; unrelated schemas and foreign keys excluded.",
  };
  if (process.env.PLATFORM_SCHEMA_EVIDENCE)
    await writeFile(
      process.env.PLATFORM_SCHEMA_EVIDENCE,
      JSON.stringify(metadata, null, 2) + "\n",
      { mode: 0o600 },
    );
  console.log(JSON.stringify(metadata));
} finally {
  await db.close();
}
