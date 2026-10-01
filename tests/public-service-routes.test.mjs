import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const { NextRequest } = require('next/server');
const output = ts.transpileModule(readFileSync('src/middleware.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const module = {exports:{}};
const originModule = {exports:{}};
const originOutput = ts.transpileModule(readFileSync('src/lib/public-origin.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
new Function('require','module','exports',originOutput)(require,originModule,originModule.exports);
const projectRequire = spec => spec === '@/lib/public-origin' ? originModule.exports : require(spec);
new Function('require','module','exports','process',output)(projectRequire,module,module.exports,{env:{NODE_ENV:'production'}});
const middleware = module.exports.middleware;
for (const pathname of ['/api/cron/newsletter','/api/cron/storage','/api/internal/storage','/api/axxes/products']) {
 test(`${pathname} reaches its handler without a user session`,()=>{
  const response=middleware(new NextRequest('https://members.v2.axxes.app'+pathname));
  assert.equal(response.headers.get('x-middleware-next'),'1');
 });
}
for (const pathname of ['/api/cron/newsletter-extra','/api/cron/storage-extra','/api/internal/storage-extra','/api/axxes/products-extra','/dashboard']) {
 test(`${pathname} keeps the session guard`,()=>{
  const response=middleware(new NextRequest('https://members.v2.axxes.app'+pathname));
  assert.equal(response.status,307);
  assert.ok(response.headers.get('location').includes('/sign-in'));
 });
}

test('production secure session cookie reaches the tenant-protected dashboard',()=>{
 const response=middleware(new NextRequest('https://members.v2.axxes.app/dashboard',{headers:{cookie:'__Secure-better-auth.session_token=synthetic-test-cookie; tenant_id=00000000-0000-4000-8000-000000000001'}}));
 assert.equal(response.headers.get('x-middleware-next'),'1');
});

test('signed-out workspace launches retain the organization and public host through sign-in',()=>{
 const path='/api/organization/open?tenant=00000000-0000-4000-8000-000000000001';
 const response=middleware(new NextRequest('https://0.0.0.0:8080'+path,{headers:{host:'members.axxes.club','x-forwarded-proto':'https'}}));
 const target=new URL(response.headers.get('location'));
 assert.equal(target.origin,'https://members.axxes.club');
 assert.equal(target.searchParams.get('redirect'),path);
});
