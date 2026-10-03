import {NextResponse} from 'next/server';
import {randomBytes,createHash} from 'node:crypto';
import {mailActor,mailConfig,privateError} from '@/lib/mail/server';
import {sealMailPayload} from '@/lib/mail/security';
export const runtime='nodejs';
export async function GET(){const config=mailConfig(),userId=await mailActor();if(!userId)return NextResponse.redirect(config.origin+'/sign-in');if(config.sessionKey.length<24||!config.clientSecret)return privateError('Secure Mail sign-in configuration is pending',503);
 const state=randomBytes(32).toString('base64url'),verifier=randomBytes(48).toString('base64url');
 const url=new URL(config.handshake+'/api/auth/oauth2/authorize');url.search=new URLSearchParams({client_id:config.clientId,redirect_uri:config.callback,response_type:'code',scope:'openid profile email',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).toString();
 const response=NextResponse.redirect(url);response.cookies.set('axxes_mail_flow',sealMailPayload({state,verifier,userId,expiresAt:Date.now()+600000},config.sessionKey),{httpOnly:true,secure:new URL(config.origin).protocol==='https:',sameSite:'lax',path:'/api/workspace/auth',maxAge:600});response.headers.set('cache-control','no-store');return response;
}
