import {Pool} from 'pg';
import type {Sql} from './directory';
import {createAdminHandler,type AdminDependencies} from './http';
import {createIntegrationAuthenticator} from './integration-auth';
const shared=globalThis as unknown as {platformAdminPool?:Pool};
export function administrationDatabase(){const pool=shared.platformAdminPool??=new Pool({connectionString:process.env.DATABASE_URL,max:2,connectionTimeoutMillis:5000,statement_timeout:5000,idleTimeoutMillis:30000});return {query:async(sql:string,values?:unknown[])=>pool.query(sql,values),async transaction<T>(work:(tx:Sql)=>Promise<T>):Promise<T>{const client=await pool.connect();try{await client.query('BEGIN');const result=await work({query:(sql,values)=>client.query(sql,values)});await client.query('COMMIT');return result;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}};}
export function runtimeAdmin(overrides:Partial<AdminDependencies>={}){
 const db=administrationDatabase();const config={principal:process.env.PLATFORM_ADMIN_PRINCIPAL??'',subject:process.env.PLATFORM_ADMIN_PRINCIPAL_SUBJECT??'',audience:'https://members-njehxvkw2q-uw.a.run.app'};
 return createAdminHandler({db,authenticate:createIntegrationAuthenticator(config),policyReady:process.env.PLATFORM_ADMIN_READY==='true',services:(process.env.PLATFORM_VERIFIED_SERVICES??'').split(',').filter(s=>['members','handshake','lanes','developer','axxes-workspace-api'].includes(s)),...overrides});
}
