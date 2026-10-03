import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const {PGlite}=createRequire(process.env.AXXES_TEST_DEPENDENCIES||import.meta.url)('@electric-sql/pglite');
export async function fixture(){const db=new PGlite();await db.exec(`
CREATE TABLE "user"(id text primary key,name text,email text,email_verified boolean,is_superadmin boolean default false,created_at timestamptz default now(),updated_at timestamptz default now());
CREATE TABLE tenants(id uuid primary key,name text,slug text,status text,owner_id text,email text,created_at timestamptz default now(),updated_at timestamptz default now(),deleted_at timestamptz);
CREATE TABLE tenant_memberships(id uuid primary key,tenant_id uuid,user_id text,role text,joined_at timestamptz default now(),updated_at timestamptz default now(),deleted_at timestamptz,UNIQUE(tenant_id,user_id));
CREATE TABLE tenant_invitations(id uuid primary key,tenant_id uuid,email text,role text,token text,status text,expires_at timestamptz,invited_by_id text,accepted_by_id text,accepted_at timestamptz,created_at timestamptz default now(),updated_at timestamptz default now());
INSERT INTO "user"(id,name,email,email_verified,created_at) VALUES('a','Ada','ada@example.com',true,'2026-01-01'),('b','Bea','bea@example.com',true,'2026-01-01'),('c','Cyd','cyd@example.com',true,'2026-01-02');
INSERT INTO tenants(id,name,slug,status,owner_id) VALUES('11111111-1111-4111-8111-111111111111','Studio','studio','active','a');
INSERT INTO tenant_memberships(id,tenant_id,user_id,role) VALUES('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','a','owner');
`);return db;}

export async function policyFixture(){const db=await fixture();await db.exec(await readFile(new URL('../../db/platform-admin/001-policy.sql',import.meta.url),'utf8'));return db;}
