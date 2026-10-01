import {commercePayments,gangstarzCommerce} from '@/lib/commerce/runtime';
import {storagePool} from '@/lib/storage/database';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 if(!process.env.CRON_SECRET||request.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return Response.json({error:'Unauthorized'},{status:401});
 const client=await storagePool().connect();
 try{const {tenantId}=await gangstarzCommerce();const rows=(await client.query<{id:string;mode:'test'|'live'}>("SELECT id,mode FROM commerce_checkouts WHERE tenant_id=$1 AND state IN ('awaiting_gateway','pending','paid','partially_refunded') ORDER BY updated_at LIMIT 10",[tenantId])).rows;let reconciled=0,unavailable=0;const deadline=Date.now()+100000;for(const row of rows){if(Date.now()>deadline)break;try{const {payments}=await commercePayments(row.mode,false);if((await payments.reconcile(row.id,tenantId)).reconciled)reconciled++;}catch{unavailable++;}finally{await client.query('UPDATE commerce_checkouts SET updated_at=now() WHERE id=$1 AND tenant_id=$2',[row.id,tenantId]);}}return Response.json({checked:rows.length,reconciled,unavailable},{headers:{'cache-control':'no-store'}});}catch{return Response.json({error:'Commerce reconciliation unavailable'},{status:503});}finally{client.release();}
}
