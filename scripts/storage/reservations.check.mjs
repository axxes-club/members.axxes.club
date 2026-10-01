import{test}from'node:test';import assert from'node:assert/strict';import{randomUUID}from'node:crypto';
import{reserveBatch,expireReservations,readStorage}from'../../src/lib/storage/quota.mjs';import{database,key}from'./database.mjs';
async function transaction(pool,fn){const c=await pool.connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
function record(bytes,expires=Date.now()+10000){return{id:randomUUID(),descriptor:{size:bytes},maxExpiresAt:expires};}
test('concurrent 3 GB batches against 5 GB admit exactly one',async()=>{const d=await database();try{
const r=await Promise.allSettled([1,2].map(()=>transaction(d.pool,c=>reserveBatch(c,{key,records:[record(3000000000)],enforce:'enforce',now:new Date()}))));
assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'storage_limit_exceeded');
assert.equal((await readStorage(d.pool,key)).reservedBytes,'3000000000');}finally{await d.close();}});
test('over-limit and insert failures reserve none of a batch',async()=>{const d=await database();try{
await assert.rejects(transaction(d.pool,c=>reserveBatch(c,{key,records:[record(4000000000),record(2000000000)],enforce:'enforce',now:new Date()})),e=>e.code==='storage_limit_exceeded');
assert.equal((await readStorage(d.pool,key)).reservedBytes,'0');const id=randomUUID();
await assert.rejects(transaction(d.pool,c=>reserveBatch(c,{key,records:[{...record(1),id},{...record(2),id}],enforce:'enforce',now:new Date()})));
assert.equal((await readStorage(d.pool,key)).reservedBytes,'0');assert.equal((await d.pool.query('SELECT count(*) FROM storage_reservations')).rows[0].count,'0');}finally{await d.close();}});
test('abandoned reservations expire once and recover available capacity',async()=>{const d=await database();try{
const now=new Date();await transaction(d.pool,c=>reserveBatch(c,{key,records:[record(3000000000,now.getTime()+10)],enforce:'enforce',now}));
assert.equal(await transaction(d.pool,c=>expireReservations(c,new Date(now.getTime()+20))),1);
assert.equal(await transaction(d.pool,c=>expireReservations(c,new Date(now.getTime()+20))),0);
assert.equal((await readStorage(d.pool,key)).remainingBytes,'5000000000');}finally{await d.close();}});
test('shadow records would exceed capacity without denying admission',async()=>{const d=await database();try{
await transaction(d.pool,c=>reserveBatch(c,{key,records:[record(6000000000)],enforce:'shadow',now:new Date()}));
assert.equal((await readStorage(d.pool,key)).reservedBytes,'6000000000');}finally{await d.close();}});
test('registry batch atomically creates receipts and quota before any policies',async()=>{
const {PostgresRegistry}=await import('../../src/lib/gcs/postgres-registry.mjs');const{Adapter}=await import('../../src/lib/gcs/core.mjs');
const{readFile}=await import('node:fs/promises');const d=await database();try{
await d.pool.query(await readFile(new URL('../../src/lib/gcs/registry.sql',import.meta.url),'utf8'));
let policies=0;const registry=new PostgresRegistry(d.pool,{quotaMode:'enforce'});
const adapter=new Adapter({app:'dam',bucket:'test-private',baseUrl:'https://folders.example',origins:['https://folders.example'],registry,
 routes:{assetUploader:{files:{blob:{bytes:6000000000,count:2}},visibility:'private',authorize:async()=>({owner:'synthetic-owner',metadata:{tenantId:key.tenantId,userId:key.userId}})}},
 store:{async assertPrivate(){},async signPost(){policies++;return{url:'https://google.example',fields:{}};}}});
const request=new Request('https://folders.example/api/storage',{headers:{origin:'https://folders.example'}});
await assert.rejects(adapter.init(request,'assetUploader',[{name:'one.bin',type:'application/octet-stream',size:4000000000},{name:'two.bin',type:'application/octet-stream',size:2000000000}]),e=>e.code==='storage_limit_exceeded');
assert.equal(policies,0);assert.equal((await d.pool.query('SELECT count(*) FROM gcp_asset_uploads')).rows[0].count,'0');assert.equal((await readStorage(d.pool,key)).reservedBytes,'0');
const r=await adapter.init(request,'assetUploader',[{name:'one.bin',type:'application/octet-stream',size:100}]);assert.equal(r.length,1);assert.equal(policies,1);assert.equal((await readStorage(d.pool,key)).reservedBytes,'100');
}finally{await d.close();}});
