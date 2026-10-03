import test from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import fs from 'node:fs';
test('active Atelier binding refuses legacy page, block, draft and publication mutations; rollback restores writes',async()=>{
 const db=new PGlite();try{
 await db.exec(`CREATE TABLE atelier_gangstarz_bindings(tenant_id uuid,source_page_id uuid,active boolean);CREATE TABLE pages(id uuid,tenant_id uuid,title text);CREATE TABLE page_blocks(id uuid,page_id uuid,tenant_id uuid,content jsonb);CREATE TABLE website_drafts(page_id uuid,tenant_id uuid,snapshot jsonb);CREATE TABLE website_publications(page_id uuid,tenant_id uuid,snapshot jsonb);CREATE TABLE website_revisions(page_id uuid,tenant_id uuid,snapshot jsonb);`);
 const t='11111111-1111-4111-8111-111111111111',p='22222222-2222-4222-8222-222222222222';
 await db.query('INSERT INTO pages VALUES($1,$2,$3)',[p,t,'Original']);await db.query('INSERT INTO atelier_gangstarz_bindings VALUES($1,$2,true)',[t,p]);
 await db.exec(fs.readFileSync(new URL('../../db/gangstarz-atelier-cutover.sql',import.meta.url),'utf8'));
 await assert.rejects(db.query('UPDATE pages SET title=$1 WHERE id=$2',['Bad',p]),/Atelier/);
 await assert.rejects(db.query('DELETE FROM pages WHERE id=$1',[p]),/Atelier/);
 await assert.rejects(db.query('INSERT INTO page_blocks VALUES($1,$1,$2,$3)',[p,t,'{}']),/Atelier/);
 for(const table of ['website_drafts','website_publications','website_revisions'])await assert.rejects(db.query(`INSERT INTO ${table} VALUES($1,$2,$3)`,[p,t,'{}']),/Atelier/);
 await db.query('INSERT INTO pages VALUES($1,$1,$2)',[t,'Other']);await db.query('UPDATE pages SET title=$1 WHERE id=$2',['Allowed',t]);
 await db.exec('UPDATE atelier_gangstarz_bindings SET active=false');await db.query('UPDATE pages SET title=$1 WHERE id=$2',['Restored',p]);assert.equal((await db.query<{title:string}>('SELECT title FROM pages WHERE id=$1',[p])).rows[0].title,'Restored');
 }finally{await db.close()}
});
