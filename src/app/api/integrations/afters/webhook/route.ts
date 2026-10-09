import {NextResponse} from 'next/server';
import {getIntegration} from '@/lib/integrations';
import {db} from '@/lib/db';
import {integrationConnection} from '@/lib/db/schema';
import {eq,and} from 'drizzle-orm';
import {parseWebhook,reserveDelivery,finishDelivery} from '@/lib/security/webhook.mjs';
import {securityPool,wrapAdmission} from '@/lib/security/admission-server';
async function handle(request:Request){
 let delivery:{digest:string;lease:string}|undefined;
 try{
  const event=await parseWebhook(request,process.env.AFTERS_WEBHOOK_SECRET);
  const connection=await db.query.integrationConnection.findFirst({where:and(eq(integrationConnection.tenantId,event.tenantId),eq(integrationConnection.provider,'afters'),eq(integrationConnection.isActive,true))});
  if(!connection)return NextResponse.json({error:'No active connection found'},{status:404});
  const integration=getIntegration('afters');if(!integration)return NextResponse.json({error:'Integration unavailable'},{status:503});
  const lease=await reserveDelivery(securityPool(),'afters',event.digest);
  if(!lease)return NextResponse.json({success:true,duplicate:true});
  delivery={digest:event.digest,lease};
  const result=await integration.handleWebhook({eventType:event.eventType,payload:event.payload});
  await finishDelivery(securityPool(),'afters',event.digest,lease,result.success);delivery=undefined;
  return NextResponse.json({success:result.success,action:result.action},{status:result.success?200:503});
 }catch(error){
  if(delivery)await finishDelivery(securityPool(),'afters',delivery.digest,delivery.lease,false).catch(()=>{});
  const status=error&&typeof error==='object'&&'status'in error&&typeof error.status==='number'?error.status:503;
  return NextResponse.json({error:status===503?'Webhook unavailable':'Invalid webhook'},{status});
 }
}
const admitted=wrapAdmission(handle,'afters-webhook',1200);
export async function POST(request:Request){if(!process.env.AFTERS_WEBHOOK_SECRET)return NextResponse.json({error:'Webhook unavailable'},{status:503});return admitted(request);}
export async function GET(){return NextResponse.json({status:'ok',endpoint:'afters-webhook'});}
