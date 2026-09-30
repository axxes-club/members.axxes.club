const { PGlite } = require('@electric-sql/pglite');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
const db=new PGlite();
await db.exec(`CREATE TABLE "user"(id text primary key);CREATE TABLE tenants(id uuid primary key);CREATE TABLE assets(id uuid primary key default gen_random_uuid(),tenant_id uuid not null references tenants(id),folder text,url text,source text);CREATE TABLE upload_sessions(id uuid primary key,tenant_id uuid not null);INSERT INTO "user" VALUES('a'),('b');INSERT INTO tenants VALUES('11111111-1111-1111-1111-111111111111');INSERT INTO assets(tenant_id,folder,url,source) VALUES('11111111-1111-1111-1111-111111111111','Apps/Nexus','https://x.ufs.sh/f/key','upload');`);
await db.exec(readFileSync(path.join(__dirname,'folders-ownership.sql'),'utf8'));
const legacy=(await db.query('select tenant_id,owner_user_id,storage_key from assets')).rows[0];assert.equal(legacy.owner_user_id,null);assert.equal(legacy.storage_key,'key');assert.equal((await db.query('select * from asset_folders')).rows.length,1);
await db.exec(`INSERT INTO assets(tenant_id,owner_user_id,url,source) VALUES(NULL,'a','private','upload');`);
for(const values of [`NULL,NULL`,`'11111111-1111-1111-1111-111111111111','a'`]){await assert.rejects(db.exec(`INSERT INTO assets(tenant_id,owner_user_id,url) VALUES(${values},'bad')`));}
await db.exec(`INSERT INTO asset_app_grants(asset_id,app_key,record_id,audience_tenant_id) SELECT id,'nexus','22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111' FROM assets LIMIT 1;`);
console.log('PASS migration fixture: legacy workspace ownership, storage backfill, persistent folders, personal owner, exclusive owner constraints, app grants');await db.close();

})().catch(error=>{console.error(error);process.exitCode=1});
