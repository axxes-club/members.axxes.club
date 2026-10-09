import test from 'node:test';import assert from 'node:assert/strict';
import {admit,AdmissionError} from '../src/lib/security/admission.mjs';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
test('independent instances share quotas, tenants stay separate and expired counters recover',async()=>{
 const db=new PGlite();await db.exec(await readFile(new URL('../db/security-request-limits.sql',import.meta.url),'utf8'));
 const input={service:'members',scope:'upload',subject:'user-1',tenant:'tenant-1',limit:2,windowMs:1000};
 try{
  await admit(db,input);await admit(db,input);await assert.rejects(admit(db,input),e=>e instanceof AdmissionError&&e.status===429);
  await admit(db,{...input,tenant:'tenant-2'});
  await db.query("UPDATE security_request_limits SET expires_at=now()-interval '1 second'");await admit(db,input);
  const row=(await db.query('SELECT count FROM security_request_limits WHERE service=$1',['members'])).rows;assert.equal(row.length,2);
 }finally{await db.close();}
});
test('simultaneous admissions permit only the budget',async()=>{
 const db=new PGlite();await db.exec(await readFile(new URL('../db/security-request-limits.sql',import.meta.url),'utf8'));
 try{const results=await Promise.allSettled(Array.from({length:20},()=>admit(db,{service:'members',scope:'create',subject:'user',tenant:'tenant',limit:3,windowMs:60000})));assert.equal(results.filter(r=>r.status==='fulfilled').length,3);}finally{await db.close();}
});
test('missing schema and query outages reject admission before work',async()=>{
 const db=new PGlite();try{await assert.rejects(admit(db,{service:'members',scope:'create',subject:'user',limit:3}),e=>e.status===503);}finally{await db.close();}
});
test('cookie mutations reject foreign or missing Origin before invoking work',async()=>{
 const {wrapAdmission}=await import('../src/lib/security/admission.mjs');let work=0;
 const handle=wrapAdmission(async()=>{work++;return new Response('ok');},async()=>{});
 for(const origin of [undefined,'https://attacker.test']){const headers={cookie:'better-auth.session_token=unit.session',host:'members.axxes.club',...(origin?{origin}:{})};const response=await handle(new Request('https://members.axxes.club/api/assets',{method:'POST',headers,body:'{}'}));assert.equal(response.status,403);}
 assert.equal(work,0);
 const response=await handle(new Request('https://members.axxes.club/api/assets',{method:'POST',headers:{cookie:'better-auth.session_token=unit.session',origin:'https://members.axxes.club'},body:'{}'}));assert.equal(response.status,200);
});
