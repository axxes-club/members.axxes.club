import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const nativeRequire=createRequire(import.meta.url);
const { NextRequest }=nativeRequire('next/server');
const output=ts.transpileModule(readFileSync('src/app/api/cron/newsletter/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
for (const [name,env,headers] of [
 ['missing configured secret',{},{}],
 ['missing bearer token',{CRON_SECRET:'synthetic-cron-secret'},{}],
 ['incorrect bearer token',{CRON_SECRET:'synthetic-cron-secret'},{authorization:'Bearer wrong'}],
]) {
 test(`newsletter refuses ${name} before reading campaigns`,async()=>{
  const module={exports:{}};
  function require(spec) {
   if(spec==='next/server')return nativeRequire(spec);
   if(spec==='@/lib/db')return {db:new Proxy({}, {get(){throw new Error('Unauthorized cron touched the database')}})};
   return {};
  }
  new Function('require','module','exports','process',output)(require,module,module.exports,{env});
  const response=await module.exports.GET(new NextRequest('https://members.v2.axxes.app/api/cron/newsletter',{headers}));
  assert.equal(response.status,401);
  assert.deepEqual(await response.json(),{error:'Unauthorized'});
 });
}
