import {NextRequest} from 'next/server';
import {allowedWorkspacePath,openMailSession,sameOriginMutation,readBoundedText,MailStreamLimitError} from '@/lib/mail/security';
import {mailActor,mailConfig,privateError} from '@/lib/mail/server';
export const runtime='nodejs';
async function proxy(request:NextRequest,context:{params:Promise<{path:string[]}>}){
 const config=mailConfig(),path=(await context.params).path.join('/');if(!allowedWorkspacePath(path,request.method))return privateError('Mail endpoint is unavailable',404);
 if(request.method!=='GET'&&!sameOriginMutation(request.headers.get('origin'),config.origin))return privateError('Origin is unavailable',403);
 const actor=await mailActor();if(!actor)return privateError('Sign in required',401);
 const session=openMailSession(request.cookies.get('axxes_mail_session')?.value||'',config.sessionKey,actor);if(!session)return privateError('Connect your Mail session',401);
 const length=Number(request.headers.get('content-length')||0);if(length>1048576)return privateError('Request is too large',413);
 let body:string|undefined;try{body=request.method==='POST'?await readBoundedText(request.body,1048576):undefined;}catch(error){return privateError(error instanceof MailStreamLimitError?'Request is too large':'Request could not be read',error instanceof MailStreamLimitError?413:400);}
 try{const upstream=await fetch(config.api+'/'+path+request.nextUrl.search,{method:request.method,headers:{authorization:'Bearer '+session.accessToken,...(body?{'content-type':'application/json'}:{}),...(request.headers.get('idempotency-key')?{'idempotency-key':request.headers.get('idempotency-key')!}:{})},body,redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(![200,201,202,400,401,403,404,409,503].includes(upstream.status))return privateError('Mail service is temporarily unavailable',503);const text=await readBoundedText(upstream.body,8000000);return new Response(text,{status:upstream.status,headers:{'content-type':'application/json','cache-control':'no-store'}});
 }catch{return privateError('Mail service is temporarily unavailable',503);}
}
export const GET=proxy,POST=proxy;
