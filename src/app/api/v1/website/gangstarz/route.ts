import {NextResponse} from 'next/server';
import {auth} from '@/lib/auth';
import {websitePool,websitePublication} from '@/lib/website/runtime';
import {WebsiteError} from '@/lib/website/publication';
export const dynamic='force-dynamic';
async function context(request:Request){
 const session=await auth.api.getSession({headers:request.headers});
 if(!session?.user)throw new WebsiteError('Sign in to AXXES to manage this website',401);
 const {rows}=await websitePool.query(`SELECT t.id AS tenant_id,p.id AS page_id FROM tenants t JOIN tenant_memberships m ON m.tenant_id=t.id AND m.user_id=$1 AND m.deleted_at IS NULL JOIN pages p ON p.tenant_id=t.id AND p.slug='home' WHERE t.slug='gangstarz' AND t.deleted_at IS NULL`,[session.user.id]);
 if(!rows.length)throw new WebsiteError('You do not have access to the Gangstarz workspace',403);
 return {principal:{userId:session.user.id,tenantId:rows[0].tenant_id},pageId:rows[0].page_id};
}
function failure(error:unknown){return NextResponse.json({error:error instanceof WebsiteError?error.message:'Website operation failed'},{status:error instanceof WebsiteError?error.status:500,headers:{'Cache-Control':'no-store'}})}
export async function GET(request:Request){try{const {principal,pageId}=await context(request);const data=await websitePublication.draft(principal,pageId);const revisions=await websitePublication.history(principal,pageId);return NextResponse.json({data,revisions},{headers:{'Cache-Control':'no-store'}})}catch(e){return failure(e)}}
export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');const host=request.headers.get('host');
  if(!origin||new URL(origin).host!==host)throw new WebsiteError('Invalid request origin',403);
  if(Number(request.headers.get('content-length')||0)>1_100_000)throw new WebsiteError('Content too large',413);
  const {principal,pageId}=await context(request);const body=await request.json();let revision:number|undefined;
  if(body.action==='save')revision=await websitePublication.save(principal,pageId,body.data,body.expectedRevision);
  else if(body.action==='publish')revision=await websitePublication.publish(principal,pageId,body.expectedRevision);
  else if(body.action==='restore')revision=await websitePublication.restore(principal,pageId,body.revision,body.expectedRevision);
  else if(body.action==='unpublish')await websitePublication.unpublish(principal,pageId);
  else throw new WebsiteError('Unknown website action');
  return NextResponse.json({success:true,revision});
 }catch(e){return failure(e)}
}
