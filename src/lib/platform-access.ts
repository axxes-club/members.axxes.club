import {Pool} from 'pg';
import {createPlatformAccess,wrapPlatformAuth} from './platform-access-core';
const state=globalThis as unknown as {platformAccessPool?:Pool};
export function platformPolicyEnabled(){return process.env.PLATFORM_ACCESS_POLICY_ENABLED==='true';}
export async function platformAccessAllowed(userId:string,organizationId?:string){
 const pool=state.platformAccessPool??=new Pool({connectionString:process.env.DATABASE_URL,max:2,connectionTimeoutMillis:5000,statement_timeout:5000,idleTimeoutMillis:30000});
 if(!pool.listenerCount('error'))pool.on('error',()=>{});
 return createPlatformAccess({query:(sql,values)=>pool.query(sql,values)},platformPolicyEnabled()?'members':'').allowed(userId,organizationId);
}
export async function requirePlatformAccess(userId:string,organizationId?:string){if(!await platformAccessAllowed(userId,organizationId))throw new Error('Platform access is denied.');}

export async function platformSessionAllowed(userId:string,sessionId?:string){const pool=state.platformAccessPool??=new Pool({connectionString:process.env.DATABASE_URL,max:2,connectionTimeoutMillis:5000,statement_timeout:5000,idleTimeoutMillis:30000});
 if(!pool.listenerCount('error'))pool.on('error',()=>{});return createPlatformAccess({query:(sql,values)=>pool.query(sql,values)},'members').sessionAllowed(userId,sessionId);}
export const guardPlatformAuth=<T extends object>(base:T)=>wrapPlatformAuth(base,(id,sessionId)=>platformSessionAllowed(id,sessionId));

export async function platformOrganizationAllowed(organizationId:string){const pool=state.platformAccessPool??=new Pool({connectionString:process.env.DATABASE_URL,max:2,statement_timeout:5000});if(!pool.listenerCount('error'))pool.on('error',()=>{});const row=(await pool.query(`SELECT status,deleted_at FROM tenants WHERE id=$1`,[organizationId])).rows[0];return !!row&&!row.deleted_at&&row.status==='active';}
