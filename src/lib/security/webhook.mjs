import {createHash,createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
class WebhookError extends Error{constructor(status){super(status===503?'Webhook verification is unavailable':'Invalid webhook');this.status=status;}}
export async function parseWebhook(request,secret){
 if(!secret)throw new WebhookError(503);
 const reader=request.body?.getReader();if(!reader)throw new WebhookError(400);
 const chunks=[];let length=0;const deadline=Date.now()+5000;
 try{for(;;){let timer;const {done,value}=await Promise.race([reader.read(),new Promise((_,reject)=>{timer=setTimeout(()=>{void reader.cancel();reject(new WebhookError(503));},Math.max(1,deadline-Date.now()));timer.unref();})]).finally(()=>clearTimeout(timer));if(done)break;length+=value.length;if(length>65536){void reader.cancel();throw new WebhookError(413);}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
 const raw=Buffer.concat(chunks),signature=request.headers.get('x-afters-signature')??'';
 const expected=createHmac('sha256',secret).update(raw).digest();
 if(!/^[0-9a-f]{64}$/i.test(signature)||!timingSafeEqual(Buffer.from(signature,'hex'),expected))throw new WebhookError(401);
 let input;try{input=JSON.parse(raw.toString('utf8'));}catch{throw new WebhookError(400);}
 if(!input||typeof input.event_type!=='string'||input.event_type.length>100||typeof input.tenant_id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.tenant_id)||!input.data||typeof input.data!=='object'||Array.isArray(input.data))throw new WebhookError(400);
 return {eventType:input.event_type,tenantId:input.tenant_id,payload:{...input.data,tenant_id:input.tenant_id},digest:createHash('sha256').update(raw).digest('hex')};
}
export async function reserveDelivery(db,provider,digest){
 const lease=randomUUID();
 const result=await db.query(`WITH cleanup AS (DELETE FROM security_webhook_receipts WHERE expires_at<now()-interval '1 day' AND (provider,digest)<>($1,$2) AND (provider,digest) IN (SELECT provider,digest FROM security_webhook_receipts WHERE expires_at<now()-interval '1 day' LIMIT 20))
  INSERT INTO security_webhook_receipts(provider,digest,lease_id,state,expires_at) VALUES($1,$2,$3,'processing',now()+interval '5 minutes')
  ON CONFLICT(provider,digest) DO UPDATE SET lease_id=EXCLUDED.lease_id,state='processing',expires_at=EXCLUDED.expires_at
  WHERE security_webhook_receipts.expires_at<=now() RETURNING lease_id`,[provider,digest,lease]);
 return result.rows.length===1?lease:null;
}
export async function finishDelivery(db,provider,digest,lease,success){
 if(success)await db.query("UPDATE security_webhook_receipts SET state='done',expires_at=now()+interval '7 days' WHERE provider=$1 AND digest=$2 AND lease_id=$3",[provider,digest,lease]);
 else await db.query('DELETE FROM security_webhook_receipts WHERE provider=$1 AND digest=$2 AND lease_id=$3',[provider,digest,lease]);
}
