import{test}from'node:test';import assert from'node:assert/strict';import{randomUUID}from'node:crypto';
import{reserveBatch,commitCharge,releaseObjectCharge,readStorage}from'../../src/lib/storage/quota.mjs';import{database,key}from'./database.mjs';
async function transaction(pool,fn){const c=await pool.connect();try{await c.query('BEGIN');const r=await fn(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
async function owned(d){const id=randomUUID(),assetId=randomUUID(),objectKey='uploads/dam/owned',url='https://dam.axxes.club/api/assets/gcp?key=uploads%2Fdam%2Fowned';
await transaction(d.pool,async c=>{await reserveBatch(c,{key,records:[{id,descriptor:{size:100},maxExpiresAt:Date.now()+10000}],enforce:'enforce'});await c.query('INSERT INTO assets VALUES($1,$2,$3,$4)',[assetId,key.tenantId,url,'upload']);await commitCharge(c,{uploadId:id,assetId,objectKey,generation:'1',actualBytes:'100'});});return{assetId,objectKey,url,generation:'1'};}
test('duplicate references charge once; only last permanent removal releases once',async()=>{const d=await database();try{const x=await owned(d),copy=randomUUID();
await d.pool.query('INSERT INTO assets VALUES($1,$2,$3,$4)',[copy,key.tenantId,x.url,'upload']);assert.equal((await d.pool.query('SELECT count(*) FROM storage_asset_links')).rows[0].count,'2');
await d.pool.query('DELETE FROM assets WHERE id=$1',[x.assetId]);assert.equal(await transaction(d.pool,c=>releaseObjectCharge(c,x)),false);assert.equal((await readStorage(d.pool,key)).usedBytes,'100');
await d.pool.query('DELETE FROM assets WHERE id=$1',[copy]);assert.equal(await transaction(d.pool,c=>releaseObjectCharge(c,x)),true);assert.equal(await transaction(d.pool,c=>releaseObjectCharge(c,x)),false);assert.equal((await readStorage(d.pool,key)).usedBytes,'0');
await assert.rejects(d.pool.query('INSERT INTO assets VALUES($1,$2,$3,$4)',[randomUUID(),key.tenantId,x.url,'upload']));
}finally{await d.close();}});
test('retained and URL-only assets do not free or consume extra physical bytes',async()=>{const d=await database();try{const x=await owned(d);
assert.equal(await transaction(d.pool,c=>releaseObjectCharge(c,x)),false);await d.pool.query('INSERT INTO assets VALUES($1,$2,$3,$4)',[randomUUID(),key.tenantId,'https://example.com/external.png','url']);assert.equal((await readStorage(d.pool,key)).usedBytes,'100');
await assert.rejects(d.pool.query('INSERT INTO assets VALUES($1,$2,$3,$4)',[randomUUID(),'00000000-0000-4000-8000-000000000002',x.url,'upload']));
}finally{await d.close();}});
test('lost deletion response retains charge until a safe missing-object retry succeeds',async()=>{const{deleteChargedObject}=await import('../../src/lib/storage/quota.mjs');const d=await database();try{const x=await owned(d);await d.pool.query('DELETE FROM assets');
let physical=true;await assert.rejects(deleteChargedObject(d.pool,x,async()=>{physical=false;throw Error('lost response');}));assert.equal((await readStorage(d.pool,key)).usedBytes,'100');
assert.equal(await deleteChargedObject(d.pool,x,async()=>{assert.equal(physical,false);}),true);assert.equal((await readStorage(d.pool,key)).usedBytes,'0');
}finally{await d.close();}});
