import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
const requireModule=createRequire(process.env.AXXES_ROUTING_TEST_DEPENDENCIES||import.meta.url);
const ts=requireModule('typescript') as typeof import('typescript');
const compiled=ts.transpileModule(readFileSync(new URL('../../src/middleware.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const exports:Record<string,unknown>={};
runInNewContext(compiled,{exports,process,URL,require:(name:string)=>{
 if(name==='next/server')return {NextResponse:{next:()=>({status:200}),redirect:(url:URL)=>({status:307,location:url.href})}};
 if(name==='@/lib/public-origin')return {publicOrigin:()=> 'https://members.axxes.club'};
 throw new Error('Unexpected routing dependency');
}});
const middleware=exports.middleware as (r:{nextUrl:URL;cookies:{get:()=>undefined}})=>{status:number;location?:string};
const request=(path:string)=>({nextUrl:new URL(path,'https://members.axxes.club'),cookies:{get:()=>undefined}});
test('machine-authenticated platform routes reach their own JWT guard without browser or tenant cookies',()=>{
 for(const path of ['/api/platform-admin/v1/capabilities','/api/platform-admin/v1/users','/api/platform-admin/v1/commands'])assert.equal(middleware(request(path)).status,200);
 for(const path of ['/dashboard','/api/platform-admin/v10/users','/api/platform-admin/v1-unsafe/users'])assert.equal(middleware(request(path)).status,307);
});
