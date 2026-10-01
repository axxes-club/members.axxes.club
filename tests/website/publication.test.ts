import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '../../../gangstarz.axxes.club/node_modules/@electric-sql/pglite/dist/index.js';
import {WebsitePublication} from '../../src/lib/website/publication';
const tenant='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',page='33333333-3333-4333-8333-333333333333';
const principal={tenantId:tenant,userId:'operator'};
const data={version:1,revision:0,page:{id:page,title:'Gangstarz',slug:'home'},theme:{logo:'/media/logo.png',background:'#212121',foreground:'#FFFFFF',primary:'#F48D25',secondary:'#F9BC22',displayFont:'Teko',labelFont:'Victor Mono'},navigation:[{label:'Events',href:'#events'}],footer:{text:'Charlotte',socials:[],showPoweredBy:true,conceptLabel:'Website concept by AXXES'},blocks:[]};
async function setup(role='owner'){
 const db=new PGlite();
 await db.exec(`CREATE TABLE tenants(id uuid PRIMARY KEY,slug text); CREATE TABLE pages(id uuid PRIMARY KEY,tenant_id uuid,slug text,is_published boolean DEFAULT false); CREATE TABLE tenant_memberships(tenant_id uuid,user_id text,role text,deleted_at timestamptz); INSERT INTO tenants VALUES('${tenant}','gangstarz'),('${other}','other'); INSERT INTO pages VALUES('${page}','${tenant}','home',false);`);
 await db.query('INSERT INTO tenant_memberships VALUES($1,$2,$3,null)',[tenant,'operator',role]);
 await db.exec(await readFile(new URL('../../db/gangstarz-cms.sql',import.meta.url),'utf8'));
 const service=new WebsitePublication({connect:async()=>({query:async(sql,params)=>db.query(sql,params),release(){}})});
 return {db,service};
}
// These fail if ownership checks, transactions, revision comparison, or snapshot separation are removed.
test('draft_save_preserves_publication',async()=>{const {db,service}=await setup();try{
 const r=await service.save(principal,page,data,0);await service.publish(principal,page,r);
 await service.save(principal,page,{...data,page:{...data.page,title:'Draft only'}},r);
 const q=await db.query('SELECT snapshot FROM website_publications');assert.equal((q.rows[0] as any).snapshot.page.title,'Gangstarz');
}finally{await db.close()}});
test('foreign_block_id_denied',async()=>{const {db,service}=await setup();try{await assert.rejects(service.save({...principal,tenantId:other},page,data,0),/denied|not found/i);assert.equal((await db.query('SELECT * FROM website_drafts')).rows.length,0)}finally{await db.close()}});
test('viewer_cannot_edit_or_publish',async()=>{const {db,service}=await setup('viewer');try{await assert.rejects(service.save(principal,page,data,0),/permission/i);await assert.rejects(service.publish(principal,page,0),/permission/i)}finally{await db.close()}});
test('stale_revision_conflicts',async()=>{const {db,service}=await setup();try{await service.save(principal,page,data,0);await assert.rejects(service.save(principal,page,data,0),/conflict/i)}finally{await db.close()}});
test('restore_creates_new_draft',async()=>{const {db,service}=await setup();try{let r=await service.save(principal,page,data,0);await service.publish(principal,page,r);r=await service.save(principal,page,{...data,page:{...data.page,title:'Changed'}},r);const restored=await service.restore(principal,page,1,r);assert.equal(restored,3);assert.equal((await service.draft(principal,page)).page.title,'Gangstarz');assert.equal(((await db.query('SELECT revision FROM website_publications')).rows[0] as any).revision,1)}finally{await db.close()}});
test('invalid_payload_rejected_before_write',async()=>{const {db,service}=await setup();try{await assert.rejects(service.save(principal,page,{...data,theme:{...data.theme,logo:'javascript:alert(1)'}},0));assert.equal((await db.query('SELECT * FROM website_revisions')).rows.length,0)}finally{await db.close()}});
test('transaction_failure_rolls_back_all_blocks',async()=>{const {db,service}=await setup();try{await db.exec("ALTER TABLE website_revisions ADD CONSTRAINT no_save CHECK(actor_id <> 'operator')");await assert.rejects(service.save(principal,page,data,0));assert.equal((await db.query('SELECT * FROM website_drafts')).rows.length,0)}finally{await db.close()}});

test('public_excludes_hidden_blocks_and_private_settings',async()=>{const {db,service}=await setup();try{const r=await service.save(principal,page,{...data,privateKey:'secret',blocks:[{id:'hidden',type:'text',content:{text:'private'},settings:{},sortOrder:0,isVisible:false}]},0);await service.publish(principal,page,r);const publicData=await service.publicPage('gangstarz','home');assert.deepEqual(publicData?.blocks,[]);assert.equal('privateKey' in publicData!,false)}finally{await db.close()}});
test('unpublished_page_returns_404',async()=>{const {db,service}=await setup();try{await service.save(principal,page,data,0);assert.equal(await service.publicPage('gangstarz','home'),null)}finally{await db.close()}});
test('foreign_workspace_preview_denied',async()=>{const {db,service}=await setup();try{await service.save(principal,page,data,0);await assert.rejects(service.draft({...principal,tenantId:other},page),/denied/)}finally{await db.close()}});
test('unpublish_removes_public_page',async()=>{const {db,service}=await setup();try{const r=await service.save(principal,page,data,0);await service.publish(principal,page,r);await service.unpublish(principal,page);assert.equal(await service.publicPage('gangstarz','home'),null)}finally{await db.close()}});
