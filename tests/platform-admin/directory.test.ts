import { test } from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import { createDirectory } from '../../src/lib/platform-admin/directory';
const {PGlite} = createRequire(process.env.AXXES_TEST_DEPENDENCIES || import.meta.url)('@electric-sql/pglite');
export async function fixture(){const db=new PGlite();await db.exec(`
CREATE TABLE "user"(id text primary key,name text,email text,email_verified boolean,is_superadmin boolean default false,created_at timestamptz default now(),updated_at timestamptz default now());
CREATE TABLE tenants(id uuid primary key,name text,slug text,status text,owner_id text,email text,created_at timestamptz default now(),updated_at timestamptz default now(),deleted_at timestamptz);
CREATE TABLE tenant_memberships(id uuid primary key,tenant_id uuid,user_id text,role text,joined_at timestamptz default now(),updated_at timestamptz default now(),deleted_at timestamptz,UNIQUE(tenant_id,user_id));
CREATE TABLE tenant_invitations(id uuid primary key,tenant_id uuid,email text,role text,token text,status text,expires_at timestamptz,invited_by_id text,accepted_by_id text,accepted_at timestamptz,created_at timestamptz default now(),updated_at timestamptz default now());
INSERT INTO "user"(id,name,email,email_verified,created_at) VALUES('a','Ada','ada@example.com',true,'2026-01-01'),('b','Bea','bea@example.com',true,'2026-01-01'),('c','Cyd','cyd@example.com',true,'2026-01-02');
INSERT INTO tenants(id,name,slug,status,owner_id) VALUES('11111111-1111-4111-8111-111111111111','Studio','studio','active','a');
INSERT INTO tenant_memberships(id,tenant_id,user_id,role) VALUES('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','a','owner');
`);return db;}
test('stable pages with tied dates and insertion between reads',async()=>{const db=await fixture();try{const dir=createDirectory(db);const first=await dir.listUsers({limit:1});assert.equal(first.items[0].subject.id,'a');await db.exec(`INSERT INTO "user"(id,name,email,email_verified,created_at) VALUES('0','Zero','zero@example.com',true,'2025-01-01')`);const next=await dir.listUsers({limit:1,cursor:first.nextCursor!});assert.equal(next.items[0].subject.id,'b');assert.ok(next.nextCursor);}finally{await db.close();}});
test('safe searchable metadata and live membership only',async()=>{const db=await fixture();try{const dir=createDirectory(db);assert.equal((await dir.listUsers({limit:25,query:'Ada'})).items.length,1);const detail=await dir.getUser({authorityId:'axxes-shared',id:'a'});assert.equal(detail.memberships.length,1);assert.equal(detail.access.length,0);assert.ok(!('token' in detail));await db.exec(`UPDATE tenant_memberships SET deleted_at=now()`);assert.equal((await dir.getOrganization({authorityId:'axxes-shared',id:'11111111-1111-4111-8111-111111111111'})).memberCount,0);await assert.rejects(()=>dir.getUser({authorityId:'other',id:'a'}));}finally{await db.close();}});
