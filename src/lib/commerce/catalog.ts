import { CommerceError,type SqlClient,type Policy,type TicketRow,type ProductRow,type VariantRow } from './types';
export async function tenantFor(c:SqlClient,slug:string){
 if(slug!=='gangstarz')throw new CommerceError('Store not found',404);
 const {rows}=await c.query<{id:string;settings:{commerce?:Policy}}>('SELECT id,settings FROM tenants WHERE slug=$1 AND deleted_at IS NULL',[slug]);
 if(!rows.length)throw new CommerceError('Store not found',404);
 return {id:rows[0].id as string,policy:(rows[0].settings?.commerce??{}) as Policy};
}
export async function catalog(c:SqlClient,slug:string){
 const tenant=await tenantFor(c,slug);
 // Presentation fields let the public site render events straight from AXXES. external_url is the
 // original ticket destination, used when an event has no natively purchasable tier.
 const events=await c.query<{id:string;name:string;slug:string;starts_at:Date|string;ends_at:Date|string|null;cover_image_url:string|null;short_description:string|null;external_url:string|null;label:string|null;venue:string|null;city:string|null}>(`SELECT e.id,e.name,e.slug,e.starts_at,e.ends_at,e.cover_image_url,e.short_description,e.external_url,e.metadata->>'label' AS label,v.name AS venue,v.city
 FROM events e LEFT JOIN venues v ON v.id=e.venue_id AND v.tenant_id=e.tenant_id AND v.deleted_at IS NULL
 WHERE e.tenant_id=$1 AND e.status='published' AND e.is_private=false AND e.deleted_at IS NULL AND coalesce(e.ends_at,e.starts_at)>now() ORDER BY e.starts_at LIMIT 100`,[tenant.id]);
 const tickets=await c.query<Pick<TicketRow,'id'|'event_id'|'name'|'price'|'currency'|'min_per_order'|'max_per_order'>&{available:number|null}>(`SELECT t.id,t.event_id,t.name,t.price,t.currency,
 CASE WHEN t.quantity_total IS NULL THEN NULL ELSE greatest(0,t.quantity_total-coalesce(t.quantity_sold,0)-coalesce(t.quantity_reserved,0)) END AS available,
 t.min_per_order,t.max_per_order FROM ticket_types t JOIN events e ON e.id=t.event_id AND e.tenant_id=t.tenant_id
 WHERE t.tenant_id=$1 AND e.status='published' AND e.is_private=false AND e.deleted_at IS NULL AND e.starts_at>now()
 AND t.deleted_at IS NULL AND t.is_hidden=false AND t.status='available'
 AND (t.sales_start_at IS NULL OR t.sales_start_at<=now()) AND (t.sales_end_at IS NULL OR t.sales_end_at>now())`,[tenant.id]);
 const products=await c.query<Pick<ProductRow,'id'|'name'|'price'|'currency'|'has_variants'>&{slug:string;images:unknown;status:string;external_url:string|null;available:number}>(`SELECT p.id,p.name,p.slug,p.price,p.currency,p.has_variants,p.images,p.status,p.metadata->>'externalUrl' AS external_url,
 greatest(0,coalesce(p.quantity,0)-coalesce((SELECT sum(r.quantity) FROM commerce_reservations r WHERE r.tenant_id=p.tenant_id AND r.kind='product' AND r.resource_id=p.id AND r.state='reserved'),0)) AS available
 FROM products p WHERE p.tenant_id=$1 AND p.status IN ('active','out_of_stock') AND p.published_at IS NOT NULL AND p.deleted_at IS NULL ORDER BY p.name LIMIT 100`,[tenant.id]);
 const variants=await c.query<Pick<VariantRow,'id'|'product_id'|'name'|'price'>&{options:unknown;image_url:string|null;available:number}>(`SELECT v.id,v.product_id,v.name,v.price,v.options,v.image_url,
 greatest(0,coalesce(v.quantity,0)-coalesce((SELECT sum(r.quantity) FROM commerce_reservations r WHERE r.tenant_id=v.tenant_id AND r.kind='product' AND r.resource_id=v.id AND r.state='reserved'),0)) AS available
 FROM product_variants v JOIN products p ON p.id=v.product_id AND p.tenant_id=v.tenant_id
 WHERE v.tenant_id=$1 AND p.status IN ('active','out_of_stock') AND p.published_at IS NOT NULL AND p.deleted_at IS NULL AND v.deleted_at IS NULL`,[tenant.id]);
 return {salesEnabled:tenant.policy.enabled===true,mode:tenant.policy.mode==='live'?'live':'test',fulfillment:{pickup:tenant.policy.pickup?.instructions??null,shipping:tenant.policy.shipping??null},
 events:events.rows.map(e=>({...e,tickets:tickets.rows.filter(t=>t.event_id===e.id)})),products:products.rows.map(p=>({...p,variants:variants.rows.filter(v=>v.product_id===p.id)}))};
}
