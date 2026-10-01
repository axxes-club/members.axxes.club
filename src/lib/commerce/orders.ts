import { createHash,createHmac,randomUUID } from 'node:crypto';
import { catalog,tenantFor } from './catalog';
import { CommerceError,cartSchema,cents,transaction,type SqlPool,type SqlClient,type Checkout,type CartInput,type Line,type Policy,type CheckoutRow,type TicketRow,type ProductRow,type VariantRow } from './types';
export class CommerceOrders {
 constructor(public pool:SqlPool,private options:{receiptSecret:string}){}
 token(tenantId:string,id:string){return id+'.'+createHmac('sha256',this.options.receiptSecret).update('commerce-receipt:'+tenantId+':'+id).digest('base64url')}
 checkout(row:CheckoutRow):Checkout{return {id:row.id,tenantId:row.tenant_id,mode:row.mode,amount:row.amount,currency:row.currency,state:row.state,token:this.token(row.tenant_id,row.id),paymentId:row.payment_id??null,checkoutUrl:['awaiting_gateway','pending'].includes(row.state)?row.checkout_url??null:null}}
 async catalog(slug:string){const c=await this.pool.connect();try{return await catalog(c,slug)}finally{c.release()}}
 private async priceLine(c:SqlClient,tenantId:string,item:CartInput['items'][number]):Promise<Line>{
  if(item.kind==='ticket'){
   const {rows}=await c.query<TicketRow>(`SELECT t.*,e.name AS event_name FROM ticket_types t JOIN events e ON e.id=t.event_id AND e.tenant_id=t.tenant_id
   WHERE t.id=$1 AND t.tenant_id=$2 AND t.deleted_at IS NULL AND t.status='available' AND t.is_hidden=false
   AND e.status='published' AND e.is_private=false AND e.deleted_at IS NULL AND e.starts_at>now()
   AND (t.sales_start_at IS NULL OR t.sales_start_at<=now()) AND (t.sales_end_at IS NULL OR t.sales_end_at>now()) FOR UPDATE OF t`,[item.id,tenantId]);
   const t=rows[0];if(!t)throw new CommerceError('Ticket unavailable',404);
   if(item.variantId||item.quantity<(t.min_per_order??1)||item.quantity>(t.max_per_order??10))throw new CommerceError('Invalid ticket quantity');
   if(t.currency?.toUpperCase()!=='USD')throw new CommerceError('Unsupported configured currency');
   if(t.quantity_total===null)throw new CommerceError('Ticket capacity is not configured',503);
   const result=await c.query(`UPDATE ticket_types SET quantity_reserved=coalesce(quantity_reserved,0)+$3 WHERE id=$1 AND tenant_id=$2 AND quantity_total-coalesce(quantity_sold,0)-coalesce(quantity_reserved,0)>=$3 RETURNING id`,[item.id,tenantId,item.quantity]);
   if(!result.rows.length)throw new CommerceError('Tickets sold out',409);
   return {kind:'ticket',id:item.id,resourceId:item.id,eventId:t.event_id,name:t.event_name+' — '+t.name,quantity:item.quantity,unitAmount:cents(t.price)};
  }
  const {rows}=await c.query<ProductRow>(`SELECT * FROM products WHERE id=$1 AND tenant_id=$2 AND status='active' AND published_at IS NOT NULL AND deleted_at IS NULL FOR UPDATE`,[item.id,tenantId]);
  const p=rows[0];if(!p)throw new CommerceError('Product unavailable',404);
  if(p.currency?.toUpperCase()!=='USD')throw new CommerceError('Unsupported configured currency');
  if(!p.track_inventory||p.allow_backorder)throw new CommerceError('Product inventory must be configured for native checkout',503);
  let resource:ProductRow|VariantRow=p;
  if(p.has_variants){
   if(!item.variantId)throw new CommerceError('Select a product variant');
   resource=(await c.query<VariantRow>('SELECT * FROM product_variants WHERE id=$1 AND product_id=$2 AND tenant_id=$3 AND deleted_at IS NULL FOR UPDATE',[item.variantId,p.id,tenantId])).rows[0];
   if(!resource)throw new CommerceError('Product variant unavailable',404);
  }else if(item.variantId)throw new CommerceError('Invalid product variant');
  const held=(await c.query<{quantity:number}>("SELECT coalesce(sum(quantity),0)::int AS quantity FROM commerce_reservations WHERE tenant_id=$1 AND kind='product' AND resource_id=$2 AND state='reserved'",[tenantId,resource.id])).rows[0].quantity;
  if((resource.quantity??0)-held<item.quantity)throw new CommerceError('Not enough stock',409);
  return {kind:'product',id:p.id,resourceId:resource.id,variantId:p.has_variants?resource.id:undefined,name:p.name+(p.has_variants?' — '+(resource.name??'Variant'):''),quantity:item.quantity,unitAmount:cents(resource.price)};
 }
 private fulfillment(input:CartInput,policy:Policy,physical:boolean){
  if(!physical)return {shipping:0,method:null,address:null};
  if(input.fulfillment==='pickup'&&policy.pickup?.instructions)return {shipping:0,method:'pickup',address:null};
  const shipping=policy.shipping;
  if(input.fulfillment==='shipping'&&shipping&&Number.isInteger(shipping.flatCents)&&shipping.flatCents>=0&&input.shippingAddress&&shipping.countries?.includes(input.shippingAddress.country.toUpperCase()))return {shipping:shipping.flatCents,method:'shipping',address:input.shippingAddress};
  throw new CommerceError('Shipping or pickup fulfillment is not configured',503);
 }
 async createOrder(slug:string,raw:unknown,key:string):Promise<Checkout>{
  if(!this.options.receiptSecret||this.options.receiptSecret.length<24)throw new CommerceError('Checkout is not configured',503);
  if(!/^[a-zA-Z0-9_-]{12,100}$/.test(key))throw new CommerceError('Invalid checkout idempotency key');
  const parsed=cartSchema.safeParse(raw);if(!parsed.success)throw new CommerceError('Invalid checkout request');
  const input=parsed.data;input.buyer.email=input.buyer.email.toLowerCase();input.items.sort((a,b)=>(a.kind+':'+(a.variantId??a.id)).localeCompare(b.kind+':'+(b.variantId??b.id)));
  if(new Set(input.items.map(i=>i.kind+':'+(i.variantId??i.id))).size!==input.items.length)throw new CommerceError('Duplicate cart items');
  const hash=createHash('sha256').update(JSON.stringify(input)).digest('hex');
  return transaction(this.pool,async c=>{
   const tenant=await tenantFor(c,slug);if(tenant.policy.enabled!==true)throw new CommerceError('Sales are not enabled or configured',503);
   const mode=tenant.policy.mode==='live'?'live':'test';
   // Serializes same-key requests without blocking unrelated tenant carts.
   await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[tenant.id+':'+mode+':'+key]);
   const existing=(await c.query<CheckoutRow>('SELECT * FROM commerce_checkouts WHERE tenant_id=$1 AND mode=$2 AND idempotency_key=$3',[tenant.id,mode,key])).rows[0];
   if(existing){if(existing.request_hash!==hash)throw new CommerceError('Checkout retry payload is different',409);return this.checkout(existing)}
   const id=randomUUID(),token=this.token(tenant.id,id),lines:Line[]=[];
   for(const item of input.items)lines.push(await this.priceLine(c,tenant.id,item));
   const subtotal=lines.reduce((sum,line)=>sum+line.unitAmount*line.quantity,0);
   const delivery=this.fulfillment(input,tenant.policy,lines.some(l=>l.kind==='product'));
   const taxBps=tenant.policy.taxBps??0;if(!Number.isInteger(taxBps)||taxBps<0||taxBps>10000)throw new CommerceError('Invalid tax configuration',503);
   const tax=Math.round(subtotal*taxBps/10000),amount=subtotal+tax+delivery.shipping;
   if(!Number.isSafeInteger(amount)||amount<50||amount>99_999_999)throw new CommerceError('Invalid checkout total');
   await c.query(`INSERT INTO orders(id,tenant_id,order_number,customer_email,customer_first_name,customer_last_name,subtotal,total,shipping_total,tax_total,currency,shipping_method,shipping_address,payment_method,source,metadata)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'USD',$11,$12,'tollbooth','gangstarz',$13)`,[id,tenant.id,'GS-'+id.toUpperCase(),input.buyer.email,input.buyer.firstName,input.buyer.lastName,(subtotal/100).toFixed(2),(amount/100).toFixed(2),(delivery.shipping/100).toFixed(2),(tax/100).toFixed(2),delivery.method,delivery.address?JSON.stringify(delivery.address):null,JSON.stringify({commerceMode:mode})]);
   await c.query(`INSERT INTO commerce_checkouts(id,tenant_id,mode,idempotency_key,request_hash,capability_hash,amount,currency) VALUES($1,$2,$3,$4,$5,$6,$7,'usd')`,[id,tenant.id,mode,key,hash,createHash('sha256').update(token).digest('hex'),amount]);
   for(const line of lines){
    const reservationId=randomUUID();
    await c.query(`INSERT INTO commerce_reservations(id,checkout_id,tenant_id,kind,resource_id,product_id,event_id,quantity) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[reservationId,id,tenant.id,line.kind,line.resourceId,line.kind==='product'?line.id:null,line.eventId??null,line.quantity]);
    await c.query(`INSERT INTO order_items(id,tenant_id,order_id,type,product_id,variant_id,ticket_type_id,event_id,name,unit_price,quantity,total,properties) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,[randomUUID(),tenant.id,id,line.kind==='ticket'?'ticket':'merchandise',line.kind==='product'?line.id:null,line.variantId??null,line.kind==='ticket'?line.id:null,line.eventId??null,line.name,(line.unitAmount/100).toFixed(2),line.quantity,(line.unitAmount*line.quantity/100).toFixed(2),JSON.stringify({commerceReservationId:reservationId})]);
   }
   return this.checkout((await c.query<CheckoutRow>('SELECT * FROM commerce_checkouts WHERE id=$1',[id])).rows[0]);
  });
 }
}
