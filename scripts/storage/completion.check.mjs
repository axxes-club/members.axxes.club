import{test}from'node:test';import assert from'node:assert/strict';import{randomUUID}from'node:crypto';
import{reserveBatch,commitCharge,readStorage,cancelReservations}from'../../src/lib/storage/quota.mjs';import{database,key}from'./database.mjs';
async function transaction(pool,fn){const c=await pool.connect();try{await c.query('BEGIN');const r=await fn(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
async function reserve(d,bytes=100){const id=randomUUID();await transaction(d.pool,c=>reserveBatch(c,{key,records:[{id,descriptor:{size:bytes},maxExpiresAt:Date.now()+10000}],enforce:'enforce'}));return id;}
test('completion moves reserved to used exactly once even after capacity reduction',async()=>{const d=await database();try{
const uploadId=await reserve(d);const input={uploadId,assetId:randomUUID(),objectKey:'uploads/dam/owned',generation:'1',actualBytes:'100'};
await d.pool.query('UPDATE storage_accounts SET base_bytes=0');
await transaction(d.pool,c=>commitCharge(c,input));await transaction(d.pool,c=>commitCharge(c,input));
const r=await readStorage(d.pool,key);assert.equal(r.usedBytes,'100');assert.equal(r.reservedBytes,'0');assert.equal(r.remainingBytes,'0');
assert.equal((await d.pool.query('SELECT count(*) FROM storage_object_charges')).rows[0].count,'1');}finally{await d.close();}});
test('mismatched actual size and failed callback transaction retain reservation',async()=>{const d=await database();try{
const uploadId=await reserve(d),input={uploadId,assetId:randomUUID(),objectKey:'uploads/dam/owned',generation:'1',actualBytes:'99'};
await assert.rejects(transaction(d.pool,c=>commitCharge(c,input)));
await assert.rejects(transaction(d.pool,async c=>{await commitCharge(c,{...input,actualBytes:'100'});throw Error('callback rollback');}));
const r=await readStorage(d.pool,key);assert.equal(r.usedBytes,'0');assert.equal(r.reservedBytes,'100');assert.equal((await d.pool.query('SELECT count(*) FROM storage_asset_links')).rows[0].count,'0');}finally{await d.close();}});
test('owner cancellation releases once and prevents later completion',async()=>{const d=await database();try{
const uploadId=await reserve(d);assert.equal(await transaction(d.pool,c=>cancelReservations(c,{key:{...key,userId:'other'},uploadIds:[uploadId]})),0);
assert.equal(await transaction(d.pool,c=>cancelReservations(c,{key,uploadIds:[uploadId]})),1);assert.equal(await transaction(d.pool,c=>cancelReservations(c,{key,uploadIds:[uploadId]})),0);
await assert.rejects(transaction(d.pool,c=>commitCharge(c,{uploadId,assetId:randomUUID(),objectKey:'uploads/dam/owned',generation:'1',actualBytes:'100'})));
assert.equal((await readStorage(d.pool,key)).reservedBytes,'0');}finally{await d.close();}});
test('actual receipt transaction commits an asset and charge once across replay',async()=>{
const {PostgresRegistry}=await import('../../src/lib/gcs/postgres-registry.mjs');const{readFile}=await import('node:fs/promises');const d=await database();try{
await d.pool.query(await readFile(new URL('../../src/lib/gcs/registry.sql',import.meta.url),'utf8'));await d.pool.query('CREATE TABLE synthetic_assets(id uuid PRIMARY KEY)');
const registry=new PostgresRegistry(d.pool,{quotaMode:'enforce'}),id=randomUUID(),assetId=randomUUID();
await registry.createBatch([{id,owner:'synthetic-owner',metadata:{tenantId:key.tenantId,chargingUserId:key.userId},descriptor:{size:100},maxExpiresAt:Date.now()+10000,expiresAt:Date.now()+5000}]);
const callback=async(record,client)=>{await client.query('INSERT INTO synthetic_assets VALUES($1)',[assetId]);return{serverData:{assetId},key:'uploads/dam/owned',generation:'1',size:100};};
await registry.completeOnce(id,'synthetic-owner',callback);await registry.completeOnce(id,'synthetic-owner',callback);
assert.equal((await readStorage(d.pool,key)).usedBytes,'100');assert.equal((await readStorage(d.pool,key)).reservedBytes,'0');
assert.equal((await d.pool.query('SELECT count(*) FROM synthetic_assets')).rows[0].count,'1');
}finally{await d.close();}});
