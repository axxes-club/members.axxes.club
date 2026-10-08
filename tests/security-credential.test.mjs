import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {PGlite} from '@electric-sql/pglite';
import * as admission from '../src/lib/security/admission.mjs';
const ts=createRequire(import.meta.url)('typescript');
test('credential admission shares a normalized account budget across callers',async()=>{
 const db=new PGlite();await db.exec(await readFile(new URL('../db/security-request-limits.sql',import.meta.url),'utf8'));
 const pool={connect:async()=>({query:(...args)=>db.query(...args),release:()=>{}})};const exports={};const source=await readFile(new URL('../src/lib/security/admission-server.ts',import.meta.url),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,globalThis:{securityAdmissionPool:pool},process:{env:{DATABASE_URL:'test-only'}},require:name=>name==='./admission.mjs'?admission:{Pool:class{constructor(){throw Error('Unexpected external database connection');}}}});
 const request=email=>new Request('https://members.axxes.club/api/auth/sign-in/email',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password:'test-only'})});
 try{for(let i=0;i<30;i++)await exports.admitRequest(request(i%2?' ACCOUNT@example.test ':'account@EXAMPLE.test'),'auth-write',6000);const before=(await db.query('SELECT sum(count)::int AS count FROM security_request_limits')).rows[0].count;await assert.rejects(exports.admitRequest(request('account@example.test'),'auth-write',6000),e=>e.status===429);const after=(await db.query('SELECT sum(count)::int AS count FROM security_request_limits')).rows[0].count;assert.equal(after-before,0,'a rejected account must not consume the shared service budget');await exports.admitRequest(request('other@example.test'),'auth-write',6000);const rows=(await db.query('SELECT bucket FROM security_request_limits')).rows;assert.ok(rows.every(row=>/^[a-f0-9]{64}$/.test(row.bucket)));await db.exec('TRUNCATE security_request_limits');await exports.admitRequest(request('first@example.test'),'auth-write',2);await exports.admitRequest(request('second@example.test'),'auth-write',2);await assert.rejects(exports.admitRequest(request('must-not-create@example.test'),'auth-write',2),e=>e.status===429);assert.equal((await db.query('SELECT count(*)::int AS n,sum(count)::int AS hits FROM security_request_limits')).rows[0].n,3,'global exhaustion must not create arbitrary new account rows');assert.equal((await db.query('SELECT sum(count)::int AS hits FROM security_request_limits')).rows[0].hits,4);}finally{await db.close();}
});
