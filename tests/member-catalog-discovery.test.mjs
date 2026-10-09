import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire, Module } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const rows = ['relay', 'manifest', 'stock', 'webmaster', 'wm', 'handshake', 'account', 'tollbooth'].map(key => Object.freeze({
  key, name: key === 'tollbooth' ? 'AXXES Pay' : key, description: 'AXXES Pay and AXXES Payments',
  tagline: 'AXXES Pay checkout', surfaceInMembers: true, sso: true, membersPath: null, category: 'Work', sortOrder: 1,
}));
rows.push(Object.freeze({ ...rows[0], key: 'hidden', surfaceInMembers: false }));
const schema = new Proxy({}, { get: (_, field) => field });
// Emulate only the query boundary: production predicates select these real row fixtures.
const db = { select(fields) {
  let predicate = () => true;
  const result = () => {
    const selected = rows.filter(predicate);
    return fields ? [{ total: selected.length, sso: selected.filter(row => row.sso).length, inPortal: selected.filter(row => row.membersPath !== null).length }] : selected;
  };
  const query = { from() { return query; }, where(value) { predicate = value; return query; },
    orderBy() { return Promise.resolve(result()); }, limit(count) { return Promise.resolve(result().slice(0, count)); },
    then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); } };
  return query;
} };
const drizzle = {
  eq: (field, value) => row => row[field] === value,
  notInArray: (field, values) => row => !values.includes(row[field]),
  and: (...conditions) => row => conditions.every(condition => condition(row)),
  asc: field => field, sql: () => ({}),
};
const file = path.resolve('src/lib/actions/products.ts');
const module = new Module(file);
module.require = name => {
  if (name === 'server-only') return {};
  if (name === 'drizzle-orm') return drizzle;
  if (name === '@/lib/db') return { db };
  if (name === '@/lib/db/schema') return { axxesProduct: schema };
  throw new Error(`Unexpected import: ${name}`);
};
module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, file);
const { getProducts, getProductGroups, getCatalogStats, getProduct } = module.exports;

test('member list, groups and stats share discovery exclusions despite stale visibility flags', async () => {
  const list = await getProducts();
  assert.deepEqual(list.map(row => row.key), ['relay', 'tollbooth']);
  assert.equal(list[1].name, 'Payments');
  assert.equal(list[1].description, 'Payments and AXXES Payments');
  assert.equal(list[1].tagline, 'Payments checkout');
  assert.deepEqual(await getCatalogStats(), { total: 2, sso: 2, inPortal: 0 });
  const groups = await getProductGroups();
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].products, list);
  assert.equal(rows.find(row => row.key === 'tollbooth').name, 'AXXES Pay');
});

test('direct product access remains intact while display copy is normalized', async () => {
  assert.equal((await getProduct('manifest')).key, 'manifest');
  assert.equal((await getProduct('webmaster')).key, 'webmaster');
  assert.equal((await getProduct('tollbooth')).name, 'Payments');
  assert.equal(await getProduct('missing'), undefined);
  assert.equal(await getProduct('../manifest'), undefined);
});
