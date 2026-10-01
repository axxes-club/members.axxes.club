import{test}from'node:test';import assert from'node:assert/strict';import{planBackfill}from'../../src/lib/storage/backfill.mjs';
test('personal library references stay outside organization quota and legacy ledgers',()=>{const plan=planBackfill({assets:[{id:'personal',tenantId:null,objectKey:'uploads/dam/personal'}],objects:[{key:'uploads/dam/personal',generation:'1',size:100}],receipts:[]});assert.deepEqual(plan,{attributed:[],legacy:[]});});
test('backfill only attributes matching completed receipts and verified objects',()=>{
const asset={id:'asset',tenantId:'org',objectKey:'uploads/dam/owned'},object={key:'uploads/dam/owned',generation:'1',size:100};
const receipt={owner:'tenant:org:user:user',document:{app:'dam',metadata:{tenantId:'org',userId:'user'},descriptor:{size:100}},result:{key:object.key,generation:'1',serverData:{assetId:'asset'}}};
const plan=planBackfill({assets:[asset],objects:[object],receipts:[receipt]});assert.equal(plan.attributed.length,1);assert.equal(plan.attributed[0].userId,'user');
for(const bad of [{...receipt,result:null},{...receipt,owner:'tenant:other:user:user'},{...receipt,result:{...receipt.result,generation:'2'}}])assert.equal(planBackfill({assets:[asset],objects:[object],receipts:[bad]}).attributed.length,0);
assert.equal(planBackfill({assets:[asset],objects:[object],receipts:[]}).legacy.length,1);
});
test('an unreceipted duplicate of a proven owned object is not also legacy usage',()=>{
const object={key:'uploads/dam/owned',generation:'1',size:100},assets=[{id:'copy',tenantId:'org',objectKey:object.key},{id:'original',tenantId:'org',objectKey:object.key}],receipts=[{owner:'tenant:org:user:user',document:{app:'dam',metadata:{tenantId:'org',userId:'user'},descriptor:{size:100}},result:{key:object.key,generation:'1',serverData:{assetId:'original'}}}];
const plan=planBackfill({assets,objects:[object],receipts});assert.equal(plan.attributed.length,1);assert.equal(plan.legacy.length,0);
});
