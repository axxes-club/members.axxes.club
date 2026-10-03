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
test('all-supported revocation exhausts authorization codes beyond unrelated records',async()=>{
 const db=await policyFixture();try{
 await db.exec(`CREATE TABLE verification(id text primary key,value text); INSERT INTO verification SELECT 'unrelated-'||n,'{"userId":"b"}' FROM generate_series(1,1001) n; INSERT INTO verification VALUES('target','{"userId":"a"}'),('legacy','not-json');`);
 await revokeCredentials(db,{authorityId:'axxes-shared',id:'a'},'all-supported',{wmUserId:'wm',integrationId:'wm',correlationId:'test'});
 assert.equal((await db.query(`SELECT id FROM verification WHERE id='target'`)).rows.length,0);
 assert.equal((await db.query(`SELECT count(*)::int AS n FROM verification`)).rows[0].n,1002);
 }finally{await db.close();}
});
test('the database issuance boundary rejects inserts while account suspension holds',async()=>{
 const db=await policyFixture();try{
 await db.exec(`CREATE TABLE session(id text,user_id text); CREATE TABLE verification(id text,value text);`);
 const {readFile}=await import('node:fs/promises');
 await db.exec(await readFile(new URL('../../db/platform-admin/001-policy.sql',import.meta.url),'utf8'));
 await db.query(`INSERT INTO platform_subject_policy(subject_kind,subject_id,state) VALUES('user','a','suspended')`);
 await assert.rejects(()=>db.query(`INSERT INTO session VALUES('racing-session','a')`));
 await assert.rejects(()=>db.query(`INSERT INTO verification VALUES('racing-code','{"userId":"a"}')`));
 await db.query(`INSERT INTO session VALUES('unrelated-session','b')`);
 await db.query(`UPDATE platform_subject_policy SET state='active' WHERE subject_id='a'`);
 assert.equal((await db.query(`SELECT id FROM session WHERE user_id='a'`)).rows.length,0);
 await db.query(`INSERT INTO session VALUES('fresh-session','a')`);
 }finally{await db.close();}
});
