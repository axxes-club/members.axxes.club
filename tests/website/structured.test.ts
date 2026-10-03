import test from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';
import {structuredEditorPath} from '../../src/lib/website/structured';
test('structured_pages_route_to_their_site_editor',async()=>{
 const db=new PGlite();try{
  await db.exec(`CREATE TABLE tenants(id uuid PRIMARY KEY,slug text);CREATE TABLE website_drafts(page_id uuid PRIMARY KEY,tenant_id uuid);
  INSERT INTO tenants VALUES('11111111-1111-4111-8111-111111111111','gangstarz'),('22222222-2222-4222-8222-222222222222','other');
  INSERT INTO website_drafts VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111');`);
  const pool={query:(s:string,p?:unknown[])=>db.query<{slug:string}>(s,p)};
  assert.equal(await structuredEditorPath('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',pool),'/website/gangstarz');
  assert.equal(await structuredEditorPath('22222222-2222-4222-8222-222222222222','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',pool),null,'other tenants never see it');
  assert.equal(await structuredEditorPath('11111111-1111-4111-8111-111111111111','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',pool),null,'block-editor pages are untouched');
  assert.equal(await structuredEditorPath('11111111-1111-4111-8111-111111111111','not-a-uuid',pool),null);
 }finally{await db.close()}
});
