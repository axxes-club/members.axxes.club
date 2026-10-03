import { test } from "node:test";
import assert from "node:assert/strict";
import { policyFixture } from "./fixtures";
import { revokeCredentials } from "../../src/lib/platform-admin/credentials";
test("revocation removes existing credentials and never restores them", async () => {
  const db = await policyFixture();
  try {
    await db.exec(
      `CREATE TABLE session(id text,user_id text);CREATE TABLE oauth_access_token(id text,user_id text);CREATE TABLE api_tokens(id text,user_id text,tenant_id uuid,revoked_at timestamptz,is_active boolean);CREATE TABLE workspace_oidc_codes(user_id text);INSERT INTO session VALUES('a-session','a'),('b-session','b');INSERT INTO oauth_access_token VALUES('a-grant','a');INSERT INTO api_tokens VALUES('a-token','a','11111111-1111-4111-8111-111111111111',NULL,true);`,
    );
    await revokeCredentials(
      db,
      { authorityId: "axxes-shared", id: "a" },
      "all-supported",
      { wmUserId: "wm", integrationId: "wm", correlationId: "test" },
    );
    assert.equal(
      (await db.query(`SELECT * FROM session WHERE user_id='a'`)).rows.length,
      0,
    );
    assert.equal(
      (await db.query(`SELECT * FROM session WHERE user_id='b'`)).rows.length,
      1,
    );
    assert.equal(
      (await db.query(`SELECT * FROM oauth_access_token`)).rows.length,
      0,
    );
    assert.ok(
      (await db.query(`SELECT revoked_at FROM api_tokens`)).rows[0].revoked_at,
    );
  } finally {
    await db.close();
  }
});
