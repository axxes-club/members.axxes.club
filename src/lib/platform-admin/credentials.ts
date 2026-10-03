import { assertAuthority, type Sql } from "./directory";
import type { SubjectRef, AdminActor } from "./contracts";
export async function revokeCredentials(
  db: Sql,
  subject: SubjectRef,
  scope: "sessions" | "all-supported",
  _actor: AdminActor,
) {
  assertAuthority(subject);
  const revoked: string[] = [];
  for (const table of scope === "sessions"
    ? ["session"]
    : ["session", "oauth_access_token", "workspace_oidc_codes", "api_tokens"]) {
    const exists = (
      await db.query("SELECT to_regclass($1) AS relation", [table])
    ).rows[0]?.relation;
    if (!exists) continue;
    await db.query(
      table === "api_tokens"
        ? `UPDATE api_tokens SET revoked_at=now(),is_active=false WHERE user_id=$1 AND revoked_at IS NULL`
        : `DELETE FROM ${table} WHERE user_id=$1`,
      [subject.id],
    );
    revoked.push(table);
  }
  if (
    scope === "all-supported" &&
    (await db.query(`SELECT to_regclass('verification') AS relation`)).rows[0]
      ?.relation
  ) {
    let after = '';
    for (;;) {
      const rows = (await db.query(`SELECT id,value FROM verification WHERE id>$1 AND value LIKE '%"userId"%' ORDER BY id LIMIT 1000`, [after])).rows;
      if (!rows.length) break;
      for (const r of rows) {
        let owner: unknown;
        try { owner=JSON.parse(String(r.value)).userId; } catch { continue; }
        if(owner===subject.id) await db.query(`DELETE FROM verification WHERE id=$1`,[r.id]);
      }
      after=String(rows[rows.length-1].id);
    }
  }
  return { revoked, scope };
}
