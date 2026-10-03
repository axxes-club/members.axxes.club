import 'server-only';
import {auth} from '@/lib/auth';
import {rawCookieHeader} from '@/lib/auth/raw-cookie';
export async function mailActor(){const session=await auth.api.getSession({headers:new Headers({cookie:await rawCookieHeader()})});return session?.user?.id??null;}
export function mailConfig(){const origin=(process.env.BETTER_AUTH_BASE_URL||'https://members.axxes.club').replace(/\/$/,'');const api=(process.env.AXXES_WORKSPACE_API_URL||'https://axxes-workspace-api-njehxvkw2q-uw.a.run.app').replace(/\/$/,'');const handshake=(process.env.HANDSHAKE_URL||'https://handshake.axxes.club').replace(/\/$/,'');return {origin,api,handshake,sessionKey:process.env.WORKSPACE_SESSION_KEY||process.env.BETTER_AUTH_SECRET||'',clientId:process.env.WORKSPACE_OIDC_CLIENT_ID||'axxes-workspace-web',clientSecret:process.env.WORKSPACE_OIDC_CLIENT_SECRET||'',callback:origin+'/api/workspace/auth/callback'};}
export function privateError(message:string,status:number){return Response.json({code:status===401?'unauthorized':status===403?'forbidden':'mail_unavailable',message},{status,headers:{'cache-control':'no-store'}});}
