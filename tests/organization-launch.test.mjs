import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const { NextRequest, NextResponse } = require('next/server');
function load(file, mocks = {}) {
  const exports = {};
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(output, { exports, URL, process, require: name => Object.hasOwn(mocks, name) ? mocks[name] : require(name) });
  return exports;
}
const { publicOrigin } = load('src/lib/public-origin.ts');
const tenant = '1655ea4c-d5dd-4905-a5b9-a61fc6b7cd4d';
function route({ session = { user: { id: 'member' } }, member = true } = {}) {
  const query = { from() { return this; }, innerJoin() { return this; }, where() { return this; }, async limit() { return member ? [{ id: tenant }] : []; } };
  return load('src/app/api/organization/open/route.ts', {
    '@/lib/security/admission-server': { wrapAdmission: handler => handler },
    'next/server': { NextResponse }, 'next/headers': { headers: async () => new Headers() },
    '@/lib/auth': { auth: { api: { getSession: async () => session } } },
    '@/lib/db': { db: { select: () => query } },
    '@/lib/db/schema': { tenants: {}, tenantMemberships: {} },
    '@/lib/public-origin': { publicOrigin },
    'drizzle-orm': { and: () => {}, eq: () => {}, isNull: () => {} },
  });
}
const request = () => new NextRequest(`https://0.0.0.0:8080/api/organization/open?tenant=${tenant}`, { headers: { host: 'members.axxes.club', 'x-forwarded-proto': 'https' } });
test('a Kr8s workspace launch redirects to the public Members host and sets the workspace cookie', async () => {
  const response = await route().GET(request());
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'https://members.axxes.club/dashboard');
  assert.match(response.headers.get('set-cookie'), new RegExp(`tenant_id=${tenant}`));
});
test('signed-out launches retain their organization when sent to sign-in', async () => {
  const response = await route({ session: null }).GET(request());
  const target = new URL(response.headers.get('location'));
  assert.equal(target.origin, 'https://members.axxes.club');
  assert.equal(target.pathname, '/sign-in');
  assert.equal(target.searchParams.get('redirect'), `/api/organization/open?tenant=${tenant}`);
});
test('a forged organization hint cannot open another workspace', async () => {
  const response = await route({ member: false }).GET(request());
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('set-cookie'), null);
});
