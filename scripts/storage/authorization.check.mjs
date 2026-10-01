import{test}from'node:test';import assert from'node:assert/strict';
import{authorizeQuota,assertChargingUser}from'../../src/lib/storage/authorization.mjs';import{database,key}from'./database.mjs';
export async function identities(pool){
await pool.query(`CREATE TABLE "user"(id text PRIMARY KEY,is_superadmin boolean DEFAULT false);CREATE TABLE tenants(id uuid PRIMARY KEY,name text,status text,settings jsonb,deleted_at timestamptz);CREATE TABLE tenant_memberships(id uuid,tenant_id uuid,user_id text,role text,deleted_at timestamptz)`);
await pool.query(`INSERT INTO "user"(id) VALUES('synthetic-user'),('admin'),('manager'),('other');INSERT INTO "user" VALUES('platform',true)`);
await pool.query(`INSERT INTO tenants VALUES($1,'Synthetic','active','{}',NULL),('00000000-0000-4000-8000-000000000002','Other','active','{}',NULL)`,[key.tenantId]);
await pool.query(`INSERT INTO tenant_memberships(tenant_id,user_id,role) VALUES($1,'synthetic-user','member'),($1,'admin','admin'),($1,'manager','manager'),('00000000-0000-4000-8000-000000000002','other','admin')`,[key.tenantId]);
}
test('members and managers cannot edit; org admins cannot cross organizations',async()=>{const d=await database();try{await identities(d.pool);
for(const id of ['synthetic-user','manager','other'])await assert.rejects(authorizeQuota(d.pool,{kind:'member',id},key,true),e=>e.status===403);
await authorizeQuota(d.pool,{kind:'member',id:'admin'},key,true);
await authorizeQuota(d.pool,{kind:'member',id:'platform'},key,true);
await assert.rejects(authorizeQuota(d.pool,{kind:'platform',id:'other'},key,true),e=>e.status===403);
await authorizeQuota(d.pool,{kind:'member',id:'synthetic-user'},key,false);
await assert.rejects(authorizeQuota(d.pool,{kind:'member',id:'synthetic-user'},{...key,userId:'admin'},false),e=>e.status===403);
}finally{await d.close();}});
test('deleted membership and inactive organization deny charging and administration',async()=>{const d=await database();try{await identities(d.pool);
await assertChargingUser(d.pool,key);await d.pool.query("UPDATE tenant_memberships SET deleted_at=now() WHERE user_id='synthetic-user'");await assert.rejects(assertChargingUser(d.pool,key),e=>e.status===403);
await assert.rejects(authorizeQuota(d.pool,{kind:'member',id:'admin'},key,true),e=>e.status===403);
await d.pool.query("UPDATE tenant_memberships SET deleted_at=NULL;UPDATE tenants SET status='suspended'");await assert.rejects(assertChargingUser(d.pool,key),e=>e.status===403);
}finally{await d.close();}});
test('handoff charges its persisted creator and rejects a removed creator',async()=>{const{chargingUserForHandoff}=await import('../../src/lib/storage/authorization.mjs');const d=await database();try{await identities(d.pool);
const session={tenantId:key.tenantId,createdById:key.userId,userId:'other'};
assert.equal(await chargingUserForHandoff(d.pool,session),'synthetic-user');
await d.pool.query("UPDATE tenant_memberships SET deleted_at=now() WHERE user_id='synthetic-user'");await assert.rejects(chargingUserForHandoff(d.pool,session),e=>e.status===403);
}finally{await d.close();}});
