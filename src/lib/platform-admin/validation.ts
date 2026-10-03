import { PlatformError, type SubjectRef, type DirectoryQuery, type Page, type UserSummary, type OrganizationSummary, type Membership, type InvitationSummary, type AccessObservation, type UserDetails, type OrganizationDetails, type AdminCommand, type Action, type MembershipRole } from './contracts';
export const actions: Action[] = ['invitation.create','invitation.revoke','invitation.resend','membership.role','membership.remove','organization.profile','access.grant','access.revoke','account.suspend','account.reactivate','organization.suspend','organization.reactivate','credentials.revoke'];
export const roles: MembershipRole[] = ['owner','admin','manager','member','viewer'];
const invalid = (): never => { throw new PlatformError(400, 'INVALID_PLATFORM_INPUT', 'Invalid platform administration data.'); };
export function record(v: unknown): Record<string, unknown> { if (!v || typeof v !== 'object' || Array.isArray(v)) return invalid(); return v as Record<string,unknown>; }
export function text(v: unknown, max = 256): string { if (typeof v !== 'string' || !v.length || v.length > max || /[\u0000-\u001f]/.test(v)) return invalid(); return v; }
export function identifier(v:unknown):string { const s=text(v,160); if (!/^[A-Za-z0-9][A-Za-z0-9_.:@-]*$/.test(s) || s.includes('..')) return invalid(); return s; }
export function subject(v:unknown):SubjectRef { const r=record(v); return {authorityId:identifier(r.authorityId),id:identifier(r.id)}; }
export function subjectKey(s:SubjectRef):string { return JSON.stringify([s.authorityId,s.id]); }
export function timestamp(v:unknown):string { const s=text(v,40); if(!Number.isFinite(Date.parse(s)))return invalid();return s; }
function count(v:unknown):number { if(typeof v!=='number'||!Number.isSafeInteger(v)||v<0)return invalid();return v; }
function bool(v:unknown):boolean { if(typeof v!=='boolean')return invalid();return v; }
function role(v:unknown):MembershipRole { if(!roles.includes(v as MembershipRole))return invalid();return v as MembershipRole; }
export function cursor(v:unknown):string { const s=text(v,2048); if(!/^[A-Za-z0-9_-]+$/.test(s))return invalid();try{const r=record(JSON.parse(Buffer.from(s,'base64url').toString()));timestamp(r.createdAt);identifier(r.id);}catch{return invalid();}return s; }
export function parseDirectoryQuery(input:unknown):DirectoryQuery {
  const r=record(input),n=r.limit===undefined?25:Number(r.limit); if(!Number.isInteger(n)||n<1||n>100)return invalid();
  const q:DirectoryQuery={limit:n};if(r.query!==undefined&&r.query!=='')q.query=text(r.query,200).trim();if(r.cursor)q.cursor=cursor(r.cursor);if(r.organization)q.organization=subject(r.organization);if(r.serviceId)q.serviceId=identifier(r.serviceId);if(r.state){q.state=text(r.state,30);if(!['active','suspended','pending','cancelled','unknown'].includes(q.state))return invalid();}return q;
}
export function parseUser(v:unknown):UserSummary { const r=record(v);if(!['active','suspended','unknown'].includes(r.state as string))return invalid();return {subject:subject(r.subject),name:text(r.name),email:text(r.email,320),emailVerified:bool(r.emailVerified),state:r.state as UserSummary['state'],version:text(r.version,256),createdAt:timestamp(r.createdAt),organizationCount:count(r.organizationCount),...(r.protected===true?{protected:true}:{})}; }
export function parseOrganization(v:unknown):OrganizationSummary {const r=record(v),o=r.owner===null?null:record(r.owner);return {subject:subject(r.subject),name:text(r.name),slug:text(r.slug),state:text(r.state,30),version:text(r.version,256),createdAt:timestamp(r.createdAt),memberCount:count(r.memberCount),owner:o?{id:identifier(o.id),name:text(o.name),email:text(o.email,320)}:null};}
export function parsePage<T>(v:unknown,parser:(v:unknown)=>T):Page<T> {const r=record(v);if(!Array.isArray(r.items)||r.items.length>100)return invalid();return {items:r.items.map(parser),nextCursor:r.nextCursor===null?null:cursor(r.nextCursor),observedAt:timestamp(r.observedAt)};}
export function parseAccess(v:unknown):AccessObservation {const r=record(v);return {serviceId:identifier(r.serviceId),state:r.state==='allowed'||r.state==='denied'?r.state:'unknown',enforcement:r.enforcement==='verified'?'verified':'unverified',...(r.organization?{organization:subject(r.organization)}:{}),...(r.observedAt?{observedAt:timestamp(r.observedAt)}:{})};}
export function parseMembership(v:unknown):Membership {const r=record(v);return {id:identifier(r.id),organization:subject(r.organization),user:subject(r.user),organizationName:text(r.organizationName),name:text(r.name),email:text(r.email,320),role:role(r.role),joinedAt:timestamp(r.joinedAt)};}
export function parseInvitation(v:unknown):InvitationSummary {const r=record(v);return {id:identifier(r.id),organization:subject(r.organization),email:text(r.email,320),role:role(r.role),state:text(r.state,30),expiresAt:timestamp(r.expiresAt),...(r.deliveryState?{deliveryState:text(r.deliveryState,30)}:{})};}
function list<T>(v:unknown,parse:(v:unknown)=>T):T[]{if(!Array.isArray(v)||v.length>1000)return invalid();return v.map(parse);}
export function parseUserDetails(v:unknown):UserDetails{const r=record(v);return {...parseUser(r),memberships:list(r.memberships,parseMembership),access:list(r.access,parseAccess),invitations:list(r.invitations,parseInvitation)};}
export function parseOrganizationDetails(v:unknown):OrganizationDetails{const r=record(v);return {...parseOrganization(r),memberships:list(r.memberships,parseMembership),access:list(r.access,parseAccess),invitations:list(r.invitations,parseInvitation)};}
export function parseCommand(v:unknown):AdminCommand {
  const r=record(v),a=r.action as Action;if(!actions.includes(a))return invalid();const p=record(r.payload),s=subject(r.subject),out:AdminCommand={subject:s,action:a,expectedVersion:text(r.expectedVersion,256),payload:{}};
  const allowed:Record<Action,string[]>={'invitation.create':['email','role'],'invitation.revoke':['invitationId'],'invitation.resend':['invitationId'],'membership.role':['organization','role'],'membership.remove':['organization'],'organization.profile':['name','contactEmail'],'access.grant':['organization','serviceId'],'access.revoke':['organization','serviceId'],'account.suspend':['reason'],'account.reactivate':[],'organization.suspend':['reason'],'organization.reactivate':[],'credentials.revoke':['scope']};
  if(Object.keys(p).some(k=>!allowed[a].includes(k)))return invalid();
  if(p.organization)out.payload.organization=subject(p.organization);if(p.role)out.payload.role=role(p.role);
  if(p.email!==undefined){const email=text(p.email,320).trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return invalid();out.payload.email=email;}
  if(p.invitationId)out.payload.invitationId=identifier(p.invitationId);if(p.serviceId)out.payload.serviceId=identifier(p.serviceId);if(p.name!==undefined)out.payload.name=text(p.name,120).trim();if(p.contactEmail!==undefined){const e=text(p.contactEmail,320);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))return invalid();out.payload.contactEmail=e;}
  if(p.reason!==undefined)out.payload.reason=text(p.reason,500).trim();if(p.scope){if(!['sessions','all-supported'].includes(p.scope as string))return invalid();out.payload.scope=p.scope as 'sessions'|'all-supported';}
  if(a==='invitation.create'&&(!out.payload.email||!out.payload.role||out.payload.role==='owner'))return invalid();
  if(a.startsWith('invitation.')&&a!=='invitation.create'&&!out.payload.invitationId)return invalid();
  if(a.startsWith('membership.')&&(!out.payload.organization||(a==='membership.role'&&(!out.payload.role||out.payload.role==='owner'))))return invalid();
  if(a.startsWith('access.')&&(!out.payload.organization||!out.payload.serviceId))return invalid();
  if(a.endsWith('.suspend')&&!out.payload.reason)return invalid();if(a==='credentials.revoke'&&!out.payload.scope)return invalid();
  if(out.payload.organization&&out.payload.organization.authorityId!==s.authorityId)return invalid();return out;
}
