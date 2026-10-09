import {wrapAdmission} from '@/lib/security/admission-server';
import {NextRequest} from 'next/server';
import {allowedWorkspacePath,openMailSession,sameOriginMutation,readBoundedText,readBoundedBytes,MailStreamLimitError} from '@/lib/mail/security';
import {mailActor,mailConfig,privateError} from '@/lib/mail/server';
export const runtime='nodejs';
async function proxy(request:NextRequest,context:{params:Promise<{path:string[]}>}){
 const config=mailConfig(),path=(await context.params).path.join('/');if(!allowedWorkspacePath(path,request.method))return privateError('Mail endpoint is unavailable',404);
 const upload=request.method==='POST'&&path.endsWith('/attachments'),download=request.method==='GET'&&path.includes('/messages/')&&path.includes('/attachments/');
 if(request.method!=='GET'&&!sameOriginMutation(request.headers.get('origin'),config.origin))return privateError('Origin is unavailable',403);
 const actor=await mailActor();if(!actor)return privateError('Sign in required',401);
 const session=openMailSession(request.cookies.get('axxes_mail_session')?.value||'',config.sessionKey,actor);if(!session)return privateError('Connect your Mail session',401);
 if(upload&&request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/octet-stream')return privateError('Upload binary attachment data',415);
 const length=Number(request.headers.get('content-length')||0);if(length>1048576)return privateError('Request is too large',413);
 let body:string|ArrayBuffer|undefined;try{body=request.method==='POST'?(upload?(await readBoundedBytes(request.body,1048576)).buffer:await readBoundedText(request.body,1048576)):undefined;}catch(error){return privateError(error instanceof MailStreamLimitError?'Request is too large':'Request could not be read',error instanceof MailStreamLimitError?413:400);}
 try{const upstream=await fetch(config.api+'/'+path+request.nextUrl.search,{method:request.method,headers:{authorization:'Bearer '+session.accessToken,...(body!==undefined?{'content-type':upload?'application/octet-stream':'application/json'}:{}),...(request.headers.get('idempotency-key')?{'idempotency-key':request.headers.get('idempotency-key')!}:{})},body,redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(![200,201,202,400,401,403,404,409,413,503].includes(upstream.status))return privateError('Mail service is temporarily unavailable',503);
 if(download&&upstream.status===200){const bytes=await readBoundedBytes(upstream.body,8000000),raw=upstream.headers.get('content-disposition')||'',disposition=/^attachment; filename="attachment"; filename\*=UTF-8''[A-Za-z0-9!#$&+.^_`|~%()*-]*$/.test(raw)?raw:'attachment; filename="attachment"';return new Response(bytes,{status:200,headers:{'content-type':'application/octet-stream','content-disposition':disposition,'x-content-type-options':'nosniff','cache-control':'no-store'}})}
 const text=await readBoundedText(upstream.body,8000000);return new Response(text,{status:upstream.status,headers:{'content-type':'application/json','cache-control':'no-store'}});
 }catch{return privateError('Mail service is temporarily unavailable',503);}
}
export const GET=wrapAdmission(proxy,'mail-proxy-read'),POST=wrapAdmission(proxy,'mail-proxy-write',3000);
