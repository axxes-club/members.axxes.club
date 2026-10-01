import{key}from"./database.mjs";
export async function identities(pool){
await pool.query(`CREATE TABLE "user"(id text PRIMARY KEY,is_superadmin boolean DEFAULT false,name text DEFAULT 'Synthetic');CREATE TABLE tenants(id uuid PRIMARY KEY,name text,status text,settings jsonb,deleted_at timestamptz);CREATE TABLE tenant_memberships(id uuid,tenant_id uuid,user_id text,role text,deleted_at timestamptz)`);
await pool.query(`INSERT INTO "user"(id) VALUES('synthetic-user'),('admin'),('manager'),('other');INSERT INTO "user"(id,is_superadmin) VALUES('platform',true)`);
await pool.query(`INSERT INTO tenants VALUES($1,'Synthetic','active','{}',NULL),('00000000-0000-4000-8000-000000000002','Other','active','{}',NULL)`,[key.tenantId]);
await pool.query(`INSERT INTO tenant_memberships(tenant_id,user_id,role) VALUES($1,'synthetic-user','member'),($1,'admin','admin'),($1,'manager','manager'),('00000000-0000-4000-8000-000000000002','other','admin')`,[key.tenantId]);
}
