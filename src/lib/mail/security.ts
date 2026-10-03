import {createCipheriv,createDecipheriv,randomBytes,createHash} from 'node:crypto';
export type MailSession={accessToken:string;userId:string;expiresAt:number};
const keyBytes=(key:string)=>{if(key.length<24)throw new Error('A server-only mail session key is required');return createHash('sha256').update('axxes-mail-session-v1\0'+key).digest();};
export function sealMailPayload(session:unknown,key:string):string{const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',keyBytes(key),iv);const encrypted=Buffer.concat([cipher.update(JSON.stringify(session)),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64url');}
export function openMailPayload(value:string,key:string):Record<string,unknown>|null{try{const data=Buffer.from(value,'base64url');if(data.toString('base64url')!==value||data.length<29)return null;const decipher=createDecipheriv('aes-256-gcm',keyBytes(key),data.subarray(0,12));decipher.setAuthTag(data.subarray(12,28));const session=JSON.parse(Buffer.concat([decipher.update(data.subarray(28)),decipher.final()]).toString());return session&&typeof session==='object'&&!Array.isArray(session)?session:null;}catch{return null;}}
export const sealMailSession=sealMailPayload;
export function openMailSession(value:string,key:string,userId:string,now=Date.now()):MailSession|null{const session=openMailPayload(value,key);return session?.userId===userId&&typeof session.expiresAt==='number'&&Number.isFinite(session.expiresAt)&&session.expiresAt>now&&typeof session.accessToken==='string'&&/^[A-Za-z]{32}$/.test(session.accessToken)?{userId,expiresAt:session.expiresAt,accessToken:session.accessToken}:null;}
const uuid='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
export function allowedWorkspacePath(path:string,method:string):boolean{
 if(path==='v1/organizations')return method==='GET';const base='v1/organizations/'+uuid,mailbox=base+'/mailboxes/'+uuid;
 if(method==='GET'&&new RegExp('^'+mailbox+'/(?:composition|drafts(?:/'+uuid+')?|outbox/'+uuid+')$').test(path))return true;
 if(method==='POST'&&new RegExp('^'+mailbox+'/(?:drafts/'+uuid+'(?:/outbox)?|outbox/'+uuid+'/cancel)$').test(path))return true;
 if(method==='GET')return new RegExp('^'+base+'/(?:mailbox|directory|mail-domains|mailboxes/'+uuid+'/session)$').test(path)||new RegExp('^'+mailbox+'/messages/[A-Za-z0-9_-]{1,255}/attachments/[A-Za-z0-9][A-Za-z0-9._-]{0,127}$').test(path);
 return method==='POST'&&new RegExp('^'+base+'/(?:mail-domains(?:/'+uuid+'/(?:verify|retire))?|mailboxes/'+uuid+'/(?:jmap|attachments))$').test(path);
}
export function sameOriginMutation(origin:string|null,expected:string):boolean{try{return origin!==null&&new URL(origin).origin===new URL(expected).origin;}catch{return false;}}
export class MailStreamLimitError extends Error{constructor(){super('Mail stream exceeds size limit');}}
export async function readBoundedBytes(stream:ReadableStream<Uint8Array>|null,limit:number):Promise<Uint8Array<ArrayBuffer>>{if(!stream)return new Uint8Array(0);const reader=stream.getReader(),chunks:Uint8Array[]=[];let size=0;try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel().catch(()=>{});throw new MailStreamLimitError();}chunks.push(value);}const combined=new Uint8Array(size);let offset=0;for(const chunk of chunks){combined.set(chunk,offset);offset+=chunk.byteLength;}return combined;}finally{reader.releaseLock();}}
export async function readBoundedText(stream:ReadableStream<Uint8Array>|null,limit:number):Promise<string>{return new TextDecoder().decode(await readBoundedBytes(stream,limit));}

export function matchesExpectedMailActor(value:string|null,actor:string){return value===null||(value.length>0&&value.length<=256&&value===actor);}
