import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
function config(env={}) {const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/mail/server.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,process:{env},require:()=>({}),Response});return exports.mailConfig();}
test('mail API uses the canonical load-balanced host by default',()=>assert.equal(config().api,'https://workspace-api.axxes.app'));
test('explicit mail API override remains supported',()=>assert.equal(config({AXXES_WORKSPACE_API_URL:'https://mail.example.test/'}).api,'https://mail.example.test'));
