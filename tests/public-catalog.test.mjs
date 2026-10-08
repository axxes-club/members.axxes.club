import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire, Module } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const file = path.resolve('src/lib/public-catalog.ts');
const catalogModule = new Module(file);
catalogModule.paths = Module._nodeModulePaths(path.dirname(file));
catalogModule._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, file);
const { publicCatalogProduct } = catalogModule.exports;
const product = { key: 'relay', name: 'Relay', description: 'Team messaging', tagline: 'Stay connected', url: 'https://relay.axxes.club', color: '#123456', status: 'live', sso: true };

test('Club is omitted from the public app switcher for both available statuses', () => {
  for (const status of ['live', 'beta']) {
    assert.equal(publicCatalogProduct({ ...product, key: 'suite', name: 'AXXES.club', url: 'https://members.axxes.club', status }), null);
  }
});

test('general apps on legacy Club domains keep their public launch contract', () => {
  assert.deepEqual(publicCatalogProduct(product), { key: 'relay', name: 'Relay', description: 'Team messaging', tagline: 'Stay connected', url: 'https://relay.axxes.club', color: '#123456', status: 'live', sso: true, workspaceLaunch: true });
  assert.equal(publicCatalogProduct({ ...product, key: 'afters', status: 'beta' }).workspaceLaunch, false);
});

test('public catalog filtering leaves internal product records intact', () => {
  const club = Object.freeze({ ...product, key: 'suite', membersPath: '/dashboard', privateAccount: 'internal-only' });
  const general = Object.freeze({ ...product, membersPath: '/relay', privateAccount: 'internal-only' });
  const before = JSON.stringify([club, general]);
  publicCatalogProduct(club);
  const output = publicCatalogProduct(general);
  assert.equal(JSON.stringify([club, general]), before);
  assert.equal('membersPath' in output, false);
  assert.equal('privateAccount' in output, false);
});

test('unavailable apps and unsafe or malformed URLs stay out of the launcher', () => {
  for (const status of ['soon', 'retired']) assert.equal(publicCatalogProduct({ ...product, status }), null);
  for (const url of ['http://relay.axxes.club', 'javascript:alert(1)', 'not a URL']) assert.equal(publicCatalogProduct({ ...product, url }), null);
});
