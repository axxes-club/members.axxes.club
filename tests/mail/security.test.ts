import test from 'node:test';
import assert from 'node:assert/strict';
import {sealMailSession,openMailSession,allowedWorkspacePath,sameOriginMutation} from '../../src/lib/mail/security';
test('mail session is encrypted, bound to actor and expiry, and rejects tampering',()=>{
 const key='server-only-entropy-secret-key',now=Date.now();const token='A'.repeat(32);
 const sealed=sealMailSession({accessToken:token,userId:'alice',expiresAt:now+60000},key);
 assert.ok(!sealed.includes(token));assert.equal(openMailSession(sealed,key,'alice',now)?.accessToken,token);
 assert.equal(openMailSession(sealed,key,'bob',now),null);assert.equal(openMailSession(sealed,key,'alice',now+60000),null);
 assert.equal(openMailSession(sealed+'tamper',key,'alice',now),null);
});
test('BFF permits only workspace mail paths and same-origin mutations',()=>{
 assert.ok(allowedWorkspacePath('v1/organizations','GET'));
 assert.ok(allowedWorkspacePath('v1/organizations/11111111-1111-4111-8111-111111111111/mail-domains','POST'));
 assert.equal(allowedWorkspacePath('https://attacker.invalid','GET'),false);
 assert.equal(allowedWorkspacePath('v1/organizations/../secrets','GET'),false);
 assert.equal(allowedWorkspacePath('v1/organizations','POST'),false);
 assert.ok(sameOriginMutation('https://members.axxes.club','https://members.axxes.club'));
 assert.equal(sameOriginMutation(null,'https://members.axxes.club'),false);
 assert.equal(sameOriginMutation('https://attacker.invalid','https://members.axxes.club'),false);
});
test('stream budgets stop chunked bodies and upstream responses before materialization',async()=>{
 const {readBoundedText}=await import('../../src/lib/mail/security');let cancelled=false;
 const oversized=new ReadableStream<Uint8Array>({pull(controller){controller.enqueue(new Uint8Array(4));},cancel(){cancelled=true;}});
 await assert.rejects(readBoundedText(oversized,7),/limit/);assert.equal(cancelled,true);
 const exact=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new TextEncoder().encode('hello'));controller.close();}});
 assert.equal(await readBoundedText(exact,5),'hello');
});
