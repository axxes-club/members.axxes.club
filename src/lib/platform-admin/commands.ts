import {createHash,randomUUID} from 'node:crypto';
import {PlatformError,type AdminCommand,type AdminActor,type OperationDetails} from './contracts';
import {parseCommand,parseOperation,identifier} from './validation';import {createDirectory,assertAuthority,assertOrganizationId,type Sql} from './directory';
import {lockSubject,bumpVersion,setAccountState,setOrganizationState} from './access-policy';import {revokeCredentials} from './credentials';
import {createInvitation,resendInvitation,revokeInvitation,deliverInvitation,type TransactionSql} from './invitations';
export const ENTITLEMENT_SERVICES=['lanes','developer','axxes-workspace-api'];
const sha=(v:string)=>createHash('sha256').update(v).digest('hex');
export function operationIdFor(principal:string,key:string){const h=sha(principal+'\0'+key).slice(0,32);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
export function createCommands(db:TransactionSql,config:{services:string[];mail?:{key?:string;from?:string;fetcher?:typeof fetch}}){
 async function getOperation(id:string,byKey:boolean,principal:string):Promise<OperationDetails>{const row=(await db.query(`SELECT result FROM platform_admin_operations WHERE ${byKey?'idempotency_key':'id::text'}=$1 AND integration_id=$2`,[id,principal])).rows[0];if(!row)throw new PlatformError(404,'OPERATION_NOT_FOUND','This operation is not recorded by the authority.');return parseOperation(row.result);}
 async function execute(input:AdminCommand,key:string,actor:AdminActor):Promise<OperationDetails>{
  const command=parseCommand(input);assertAuthority(command.subject);if(command.action.startsWith('organization.')||command.action.startsWith('invitation.'))assertOrganizationId(command.subject.id);if(command.payload.organization)assertOrganizationId(command.payload.organization.id);identifier(key);if(!config.services.length)throw new PlatformError(503,'ADMINISTRATION_NOT_READY','Verified service coverage is required.');
  const hash=sha(JSON.stringify(command)),id=operationIdFor(actor.integrationId,key),kind=command.action.startsWith('organization.')||command.action.startsWith('invitation.')?'organization':'user';
  let result=await db.transaction(async tx=>{
   await tx.query(`SELECT pg_advisory_xact_lock(hashtextextended($1,0))`,[id]);
   const stored=(await tx.query(`SELECT command_hash,wm_actor,result FROM platform_admin_operations WHERE integration_id=$1 AND idempotency_key=$2`,[actor.integrationId,key])).rows[0];
   if(stored){if(stored.command_hash!==hash||stored.wm_actor!==actor.wmUserId)throw new PlatformError(409,'IDEMPOTENCY_CONFLICT','This idempotency key belongs to a different change.');return parseOperation(stored.result);}
   const detail=await lockSubject(tx,command.subject,kind,command.expectedVersion),p=command.payload;
   if(kind==='user'&&'protected' in detail&&detail.protected&&['account.suspend','account.reactivate','credentials.revoke'].includes(command.action))throw new PlatformError(403,'PROTECTED_ACCOUNT','Platform administrator access requires separate review.');
   let invitationId:string|undefined;
   if(command.action==='account.suspend'||command.action==='account.reactivate'){
    await setAccountState(tx,command.subject,command.action.endsWith('suspend')?'suspended':'active',command.expectedVersion,p.reason??'',actor);
    if(command.action==='account.suspend')await revokeCredentials(tx,command.subject,'all-supported',actor);
   }else if(command.action==='organization.suspend'||command.action==='organization.reactivate'){
    await setOrganizationState(tx,command.subject,command.action.endsWith('suspend')?'suspended':'active',command.expectedVersion,p.reason??'',actor);
    if(command.action==='organization.suspend'&&(await tx.query(`SELECT to_regclass('api_tokens') AS relation`)).rows[0]?.relation)await tx.query(`UPDATE api_tokens SET revoked_at=now(),is_active=false WHERE tenant_id=$1 AND revoked_at IS NULL`,[command.subject.id]);
   }else if(command.action==='credentials.revoke'){
    await revokeCredentials(tx,command.subject,p.scope!,actor);await bumpVersion(tx,command.subject,'user');
   }else if(command.action.startsWith('membership.')||command.action.startsWith('access.')){
    const org=p.organization!;assertAuthority(org);const organization=(await tx.query(`SELECT owner_id,status FROM tenants WHERE id=$1 AND deleted_at IS NULL FOR UPDATE`,[org.id])).rows[0];if(!organization||organization.status==='cancelled')throw new PlatformError(409,'ORGANIZATION_UNAVAILABLE','Organization is not eligible for this change.');
    const membership=(await tx.query(`SELECT id,role FROM tenant_memberships WHERE tenant_id=$1 AND user_id=$2 AND deleted_at IS NULL FOR UPDATE`,[org.id,command.subject.id])).rows[0];if(!membership)throw new PlatformError(404,'MEMBERSHIP_NOT_FOUND','Active membership not found.');
    if(command.action.startsWith('membership.')){
     if(membership.role==='owner'||organization.owner_id===command.subject.id)throw new PlatformError(403,'OWNER_TRANSFER_REQUIRED','Organization owners require an explicit ownership transfer.');
     await tx.query(command.action==='membership.role'?`UPDATE tenant_memberships SET role=$2,updated_at=now() WHERE id=$1`:`UPDATE tenant_memberships SET deleted_at=now(),updated_at=now() WHERE id=$1`,command.action==='membership.role'?[membership.id,p.role]:[membership.id]);
    }else{
     if(!ENTITLEMENT_SERVICES.includes(p.serviceId!)||!config.services.includes(p.serviceId!))throw new PlatformError(409,'UNVERIFIED_ENTITLEMENT','This service does not have verified app-access enforcement.');
     await tx.query(`INSERT INTO platform_entitlements(user_id,tenant_id,service_id,allowed) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,tenant_id,service_id) DO UPDATE SET allowed=$4,updated_at=now()`,[command.subject.id,org.id,p.serviceId,command.action==='access.grant']);
    }
    await bumpVersion(tx,command.subject,'user');await bumpVersion(tx,org,'organization');
   }else if(command.action==='organization.access.grant'||command.action==='organization.access.revoke'){
    if(!ENTITLEMENT_SERVICES.includes(p.serviceId!)||!config.services.includes(p.serviceId!))throw new PlatformError(409,'UNVERIFIED_ENTITLEMENT','This service does not have verified app-access enforcement.');
    await tx.query(`INSERT INTO platform_organization_entitlements(tenant_id,service_id,allowed) VALUES($1,$2,$3) ON CONFLICT(tenant_id,service_id) DO UPDATE SET allowed=$3,updated_at=now()`,[command.subject.id,p.serviceId,command.action==='organization.access.grant']);await bumpVersion(tx,command.subject,'organization');
   }else if(command.action==='organization.profile'){
    if(!p.name&&!p.contactEmail)throw new PlatformError(400,'EMPTY_PROFILE','Choose a profile field to update.');
    await tx.query(`UPDATE tenants SET name=coalesce($2,name),email=coalesce($3,email),updated_at=now() WHERE id=$1`,[command.subject.id,p.name??null,p.contactEmail??null]);await bumpVersion(tx,command.subject,'organization');
   }else if(command.action.startsWith('invitation.')){
    const invite=command.action==='invitation.create'?await createInvitation(tx,command.subject,p.email!,p.role!,actor):command.action==='invitation.resend'?await resendInvitation(tx,command.subject,p.invitationId!,actor):await revokeInvitation(tx,command.subject,p.invitationId!,actor);invitationId=invite.id;await bumpVersion(tx,command.subject,'organization');
   }else throw new PlatformError(400,'UNSUPPORTED_COMMAND','Unsupported administration command.');
   const directory=createDirectory(tx,true),fresh=kind==='user'?await directory.getUser(command.subject):await directory.getOrganization(command.subject);const now=new Date().toISOString();
   const result:OperationDetails={operationId:id,version:fresh.version,subject:command.subject,action:command.action,state:'succeeded',actor:actor.wmUserId,createdAt:now,updatedAt:now,message:'The authority verified this change.',services:config.services.map(serviceId=>({serviceId,state:'succeeded'})),...(invitationId?{invitationId,...(command.action!=='invitation.revoke'?{deliveryState:'pending'}:{})}:{})};
   await tx.query(`INSERT INTO platform_admin_operations(id,integration_id,idempotency_key,command_hash,wm_actor,correlation_id,state,result) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,[id,actor.integrationId,key,hash,actor.wmUserId,actor.correlationId,result.state,JSON.stringify(result)]);
   await tx.query(`INSERT INTO platform_admin_audit(id,operation_id,wm_actor,integration_id,correlation_id,subject_kind,subject_id,action,result) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'succeeded')`,[randomUUID(),id,actor.wmUserId,actor.integrationId,actor.correlationId,kind,command.subject.id,command.action]);return result;
  });
  if(result.invitationId&&result.deliveryState==='pending')result=await updateDelivery(result,actor.integrationId);
  return result;
 }
 async function updateDelivery(result:OperationDetails,principal:string){const delivery=await deliverInvitation(db,result.invitationId!,config.mail??{});const next:OperationDetails={...result,updatedAt:new Date().toISOString(),deliveryState:delivery.state,message:delivery.state==='sent'?'Invitation created and email delivered.':delivery.state==='not_configured'?'Invitation created. Email is not configured; copy the invitation link.':'Invitation created. Email delivery needs attention.',...(delivery.state==='uncertain'||delivery.state==='failed'?{state:'partial' as const}:{})};await db.query(`UPDATE platform_admin_operations SET state=$3,result=$4::jsonb WHERE id=$1 AND integration_id=$2`,[result.operationId,principal,next.state,JSON.stringify(next)]);return next;}
 async function reconcile(id:string,principal:string){const result=await getOperation(id,false,principal);if(result.invitationId&&['pending','uncertain','not_configured'].includes(result.deliveryState??''))return updateDelivery(result,principal);return result;}
 return {execute,getOperation,reconcile};
}
