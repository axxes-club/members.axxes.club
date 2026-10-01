import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {PGlite} from '@electric-sql/pglite';
test('prepared additive activation is repeatable and preserves legacy assets without backfill',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`CREATE TABLE "user"(id text PRIMARY KEY);CREATE TABLE tenants(id uuid PRIMARY KEY);CREATE TABLE tenant_memberships(tenant_id uuid,user_id text,role text,deleted_at timestamptz);CREATE TABLE assets(id uuid PRIMARY KEY,tenant_id uuid NOT NULL,folder text,url text NOT NULL,source text);CREATE TABLE upload_sessions(id uuid PRIMARY KEY,tenant_id uuid NOT NULL);CREATE TABLE asset_app_links(id uuid PRIMARY KEY,tenant_id uuid,app_key text,record_id uuid);INSERT INTO "user" VALUES('synthetic');INSERT INTO tenants VALUES('11111111-1111-4111-8111-111111111111');INSERT INTO assets VALUES('22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','Old folder','https://example.invalid/f/key','upload');`);
 const sql=execFileSync(process.execPath,['scripts/storage/prepare-activation.cjs','--include-ownership','--include-office'],{encoding:'utf8'}).replace("SELECT pg_advisory_xact_lock(hashtext('axxes-storage-main-20261001'));",'');
 await db.exec(sql);await db.exec(sql);
 assert.equal((await db.query('SELECT count(*)::int n FROM assets')).rows[0].n,1);
 assert.deepEqual((await db.query('SELECT tenant_id,owner_user_id,storage_key,url FROM assets')).rows[0],{tenant_id:'33333333-3333-4333-8333-333333333333',owner_user_id:null,storage_key:null,url:'https://example.invalid/f/key'});
 assert.equal((await db.query('SELECT count(*)::int n FROM asset_folders')).rows[0].n,0);
 for(const table of ['office_uploads','office_service_requests','storage_accounts','workspace_membership_outbox'])assert.ok((await db.query('SELECT to_regclass($1) AS name',[table])).rows[0].name);
 await db.exec(`INSERT INTO assets(id,tenant_id,owner_user_id,url,source) VALUES('44444444-4444-4444-8444-444444444444',NULL,'synthetic','https://example.invalid/new','url')`);
 assert.equal((await db.query('SELECT count(*)::int n FROM assets')).rows[0].n,2);
 }finally{await db.close();}
});
