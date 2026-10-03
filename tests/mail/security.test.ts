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
test('attachment proxy permits only mailbox upload and message-part downloads',()=>{
 const base='v1/organizations/11111111-1111-4111-8111-111111111111/mailboxes/22222222-2222-4222-8222-222222222222';
 assert.equal(allowedWorkspacePath(base+'/attachments','POST'),true);assert.equal(allowedWorkspacePath(base+'/messages/owned-message/attachments/1.2','GET'),true);
 assert.equal(allowedWorkspacePath(base+'/blobs/foreign-blob','GET'),false);assert.equal(allowedWorkspacePath(base+'/messages/owned-message/attachments/../../admin','GET'),false);assert.equal(allowedWorkspacePath(base+'/attachments','GET'),false);
});
test('bounded byte reader preserves non-UTF8 attachment bytes and cancels excess',async()=>{
 const {readBoundedBytes}=await import('../../src/lib/mail/security');let cancelled=false;const bytes=await readBoundedBytes(new ReadableStream({start(c){c.enqueue(new Uint8Array([0,255]));c.enqueue(new Uint8Array([1]));c.close()}}),3);assert.deepEqual([...bytes],[0,255,1]);
 await assert.rejects(readBoundedBytes(new ReadableStream({start(c){c.enqueue(new Uint8Array([0,255,1]));},cancel(){cancelled=true}}),2));assert.equal(cancelled,true);
});
test('durable draft and outbox proxy paths remain exact and method limited',()=>{const box='v1/organizations/11111111-1111-4111-8111-111111111111/mailboxes/22222222-2222-4222-8222-222222222222',id='33333333-3333-4333-8333-333333333333';for(const [suffix,method] of [['/drafts','GET'],['/drafts/'+id,'GET'],['/drafts/'+id,'POST'],['/drafts/'+id+'/outbox','POST'],['/outbox/'+id,'GET'],['/outbox/'+id+'/cancel','POST']])assert.equal(allowedWorkspacePath(box+suffix,method),true);for(const [suffix,method] of [['/drafts/'+id+'/outbox','GET'],['/outbox/'+id+'/cancel','GET'],['/outbox/'+id+'/submit','POST'],['/drafts/'+id+'/send','POST'],['/drafts/foreign','POST'],['/drafts/'+id,'DELETE']])assert.equal(allowedWorkspacePath(box+suffix,method),false);});

test('private composition metadata proxy is mailbox-bound and read-only',()=>{const base='v1/organizations/11111111-1111-4111-8111-111111111111/mailboxes/22222222-2222-4222-8222-222222222222';assert.equal(allowedWorkspacePath(base+'/composition','GET'),true);for(const path of [base+'/composition/send',base+'/composition/credentials','v1/organizations/11111111-1111-4111-8111-111111111111/composition'])assert.equal(allowedWorkspacePath(path,'GET'),false);assert.equal(allowedWorkspacePath(base+'/composition','POST'),false);});

test('expected actor assertion rejects a newly authenticated account before proxying',async()=>{const {matchesExpectedMailActor}=await import('../../src/lib/mail/security');assert.equal(matchesExpectedMailActor('alice','alice'),true);assert.equal(matchesExpectedMailActor(null,'alice'),true);assert.equal(matchesExpectedMailActor('alice','bob'),false);assert.equal(matchesExpectedMailActor('','alice'),false);assert.equal(matchesExpectedMailActor('x'.repeat(257),'x'.repeat(257)),false);});
