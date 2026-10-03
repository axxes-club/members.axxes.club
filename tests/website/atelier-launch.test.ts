import test from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {findGangstarzAtelierSite} from '../../src/lib/website/atelier-binding';
test('Atelier launch returns only exact active binding to current nonrevoked member',async()=>{
 const db=new PGlite();try{await db.exec(`CREATE TABLE tenants(id text,deleted_at timestamptz,status text);CREATE TABLE tenant_memberships(tenant_id text,user_id text,deleted_at timestamptz);CREATE TABLE atelier_sites(id text,tenant_id text);CREATE TABLE atelier_gangstarz_bindings(tenant_id text,site_id text,active boolean);INSERT INTO tenants VALUES('tenant',NULL,'active');INSERT INTO tenant_memberships VALUES('tenant','owner',NULL);INSERT INTO atelier_sites VALUES('site','tenant');INSERT INTO atelier_gangstarz_bindings VALUES('tenant','site',true);`);
 const client={query:async<Row>(s:string,p?:unknown[])=>db.query<Row>(s,p)};
 assert.equal(await findGangstarzAtelierSite(client,{tenantId:'tenant',userId:'owner'}),'site');assert.equal(await findGangstarzAtelierSite(client,{tenantId:'tenant',userId:'foreign'}),null);
 await db.exec('UPDATE tenant_memberships SET deleted_at=now()');assert.equal(await findGangstarzAtelierSite(client,{tenantId:'tenant',userId:'owner'}),null);
 await db.exec('UPDATE tenant_memberships SET deleted_at=NULL;UPDATE atelier_gangstarz_bindings SET active=false');assert.equal(await findGangstarzAtelierSite(client,{tenantId:'tenant',userId:'owner'}),null);
 }finally{await db.close()}
});
