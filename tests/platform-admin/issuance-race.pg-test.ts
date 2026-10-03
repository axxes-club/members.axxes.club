import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const {Pool}=createRequire(import.meta.url)('pg');
const connection=process.env.PLATFORM_TEST_DATABASE_URL;
if(!connection || new URL(connection).hostname!=='platform-postgres' || new URL(connection).pathname!=='/platform_ci') throw Error('Only the isolated platform-postgres/platform_ci fixture is permitted.');
test('credential inserts serialize with suspension and revocation in both lock orders',async()=>{
 const pool=new Pool({connectionString:connection,max:4,statement_timeout:10000});
 const issuer=await pool.connect(),admin=await pool.connect();
 try{
 await pool.query(`CREATE TABLE "user"(id text primary key);CREATE TABLE tenants(id uuid primary key);CREATE TABLE tenant_invitations(id uuid primary key);CREATE TABLE session(id text primary key,user_id text);CREATE TABLE verification(id text primary key,value text);INSERT INTO "user" VALUES('subject'),('control');`);
 await pool.query(await readFile(new URL('../../db/platform-admin/001-policy.sql',import.meta.url),'utf8'));
 for(const table of ['session','verification']){
  const insert=table==='session'?`INSERT INTO session VALUES($1,'subject')`:`INSERT INTO verification VALUES($1,'{"userId":"subject"}')`;
  // Issuance locks first: suspension must wait, then delete the committed credential.
  await pool.query(`DELETE FROM platform_subject_policy`);
  await issuer.query('BEGIN');await issuer.query(insert,[table+'-first']);
  await admin.query('BEGIN');let acquired=false;
  const lock=admin.query(`SELECT id FROM "user" WHERE id='subject' FOR UPDATE`).then(()=>{acquired=true;});
  await new Promise(r=>setTimeout(r,100));assert.equal(acquired,false);
  await issuer.query('COMMIT');await lock;
  await admin.query(`INSERT INTO platform_subject_policy(subject_kind,subject_id,state) VALUES('user','subject','suspended')`);
  await admin.query(`DELETE FROM ${table} WHERE id=$1`,[table+'-first']);await admin.query('COMMIT');
  assert.equal((await pool.query(`SELECT id FROM ${table}`)).rows.length,0);
  // Suspension locks first: a waiting credential insert must see committed policy.
  await pool.query(`DELETE FROM platform_subject_policy`);
  await admin.query('BEGIN');await admin.query(`SELECT id FROM "user" WHERE id='subject' FOR UPDATE`);
  await admin.query(`INSERT INTO platform_subject_policy(subject_kind,subject_id,state) VALUES('user','subject','suspended')`);
  await issuer.query('BEGIN');let settled=false;
  const insertion=issuer.query(insert,[table+'-late']).then(()=>({ok:true}),(error:Error)=>({ok:false,error})).finally(()=>{settled=true;});
  await new Promise(r=>setTimeout(r,100));assert.equal(settled,false);
  await admin.query('COMMIT');assert.equal((await insertion).ok,false);await issuer.query('ROLLBACK');
  await pool.query(`UPDATE platform_subject_policy SET state='active'`);
  assert.equal((await pool.query(`SELECT id FROM ${table}`)).rows.length,0);
  await issuer.query(insert,[table+'-fresh']);await pool.query(`DELETE FROM ${table}`);
 }
 await pool.query(`INSERT INTO platform_subject_policy(subject_kind,subject_id,state) VALUES('user','subject','suspended') ON CONFLICT(subject_kind,subject_id) DO UPDATE SET state='suspended'`);
 await pool.query(`INSERT INTO session VALUES('control-session','control')`);
 assert.equal((await pool.query(`SELECT id FROM session WHERE user_id='control'`)).rows.length,1);
 }finally{await issuer.query('ROLLBACK');await admin.query('ROLLBACK');issuer.release();admin.release();await pool.end();}
});
