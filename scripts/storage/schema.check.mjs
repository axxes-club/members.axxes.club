import {test} from "node:test";
import assert from "node:assert/strict";
import {readStorage,parseBytes} from "../../src/lib/storage/quota.mjs";
import {database,key} from "./database.mjs";
test("new account has 5 GB without confusing users or organizations", async()=>{
 const d=await database();try{
 const one=await readStorage(d.pool,key);
 assert.deepEqual(one,{baseBytes:"5000000000",paidBytes:"0",usedBytes:"0",reservedBytes:"0",effectiveBytes:"5000000000",remainingBytes:"5000000000",legacyBytes:"0"});
 await d.pool.query("UPDATE storage_accounts SET base_bytes=7000000000 WHERE tenant_id=$1 AND user_id=$2",[key.tenantId,key.userId]);
 assert.equal((await readStorage(d.pool,{...key,tenantId:"00000000-0000-4000-8000-000000000002"})).baseBytes,"5000000000");
 assert.equal((await readStorage(d.pool,{...key,userId:"other-user"})).baseBytes,"5000000000");
 await d.pool.query(d.sql);assert.equal((await readStorage(d.pool,key)).baseBytes,"7000000000");
 }finally{await d.close();}
});
test("byte values preserve bigint precision and reject ambiguous API values",()=>{
 assert.equal(parseBytes("9007199254740993").toString(),"9007199254740993");
 for(const x of ["-1","1.2","1e3","",1,NaN,"9223372036854775808"])assert.throws(()=>parseBytes(x));
});
test("database prevents invalid counters",async()=>{const d=await database();try{
 await readStorage(d.pool,key);
 await assert.rejects(d.pool.query("UPDATE storage_accounts SET used_bytes=-1"));
 await assert.rejects(d.pool.query("UPDATE storage_accounts SET base_bytes='1.2'"));
 await d.pool.query("UPDATE storage_accounts SET base_bytes=9007199254740993");
 assert.equal((await readStorage(d.pool,key)).effectiveBytes,"9007199254740993");
 }finally{await d.close();}});
