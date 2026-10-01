import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
export async function database() {
  const connectionString = process.env.STORAGE_TEST_DATABASE_URL;
  if (!connectionString || !["localhost", "127.0.0.1"].includes(new URL(connectionString).hostname)) throw new Error("Disposable localhost STORAGE_TEST_DATABASE_URL required");
  const name = "quota_" + randomUUID().replaceAll("-", "");
  const admin = new Pool({connectionString});
  await admin.query(`CREATE SCHEMA ${name}`);
  const pool = new Pool({connectionString, options: `-c search_path=${name}`, max:10});
  const sql = await readFile(new URL("../../drizzle/0005_storage_allowances.sql", import.meta.url), "utf8");
  await pool.query("CREATE TABLE assets(id uuid PRIMARY KEY,tenant_id uuid NOT NULL,url text NOT NULL,source text)");
  await pool.query(sql);
  return {pool, sql, async close() {await pool.end();await admin.query(`DROP SCHEMA ${name} CASCADE`);await admin.end();}};
}
export const key = {tenantId:"00000000-0000-4000-8000-000000000001",userId:"synthetic-user"};
