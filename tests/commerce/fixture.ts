import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
export const tenant='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',event='33333333-3333-4333-8333-333333333333',ticket='44444444-4444-4444-8444-444444444444',product='55555555-5555-4555-8555-555555555555',variant='66666666-6666-4666-8666-666666666666';
export async function fixture(){
 const db=new PGlite();
 await db.exec(`
 CREATE TABLE tenants(id uuid PRIMARY KEY,slug text UNIQUE,settings jsonb DEFAULT '{}',deleted_at timestamptz);
 CREATE TABLE tenant_memberships(tenant_id uuid,user_id text,role text,deleted_at timestamptz);
 CREATE TABLE events(id uuid PRIMARY KEY,tenant_id uuid,name text,slug text,starts_at timestamptz,status text,is_private boolean DEFAULT false,cover_image_url text,deleted_at timestamptz);
 CREATE TABLE ticket_types(id uuid PRIMARY KEY,tenant_id uuid,event_id uuid,name text,price numeric,currency text DEFAULT 'USD',quantity_total int,quantity_sold int DEFAULT 0,quantity_reserved int DEFAULT 0,status text DEFAULT 'available',is_hidden boolean DEFAULT false,min_per_order int DEFAULT 1,max_per_order int DEFAULT 10,sales_start_at timestamptz,sales_end_at timestamptz,deleted_at timestamptz);
 CREATE TABLE products(id uuid PRIMARY KEY,tenant_id uuid,name text,slug text,price numeric,currency text DEFAULT 'USD',quantity int DEFAULT 0,track_inventory boolean DEFAULT true,allow_backorder boolean DEFAULT false,status text DEFAULT 'active',has_variants boolean DEFAULT false,images jsonb DEFAULT '[]',published_at timestamptz,deleted_at timestamptz);
 CREATE TABLE product_variants(id uuid PRIMARY KEY,tenant_id uuid,product_id uuid,name text,price numeric,quantity int,options jsonb DEFAULT '{}',image_url text,deleted_at timestamptz);
 CREATE TABLE orders(id uuid PRIMARY KEY,tenant_id uuid,order_number text,customer_email text,customer_first_name text,customer_last_name text,status text DEFAULT 'pending',payment_status text DEFAULT 'pending',fulfillment_status text DEFAULT 'unfulfilled',subtotal numeric,total numeric,currency text,shipping_total numeric DEFAULT 0,tax_total numeric DEFAULT 0,shipping_address jsonb,shipping_method text,payment_method text,external_order_id text,external_platform text,source text,metadata jsonb,paid_at timestamptz,cancelled_at timestamptz,refunded_at timestamptz,fulfilled_at timestamptz,updated_at timestamptz DEFAULT now(),deleted_at timestamptz,UNIQUE(tenant_id,order_number));
 CREATE TABLE order_items(id uuid PRIMARY KEY,tenant_id uuid,order_id uuid,type text,product_id uuid,variant_id uuid,ticket_type_id uuid,event_id uuid,name text,unit_price numeric,quantity int,total numeric,quantity_fulfilled int DEFAULT 0,properties jsonb DEFAULT '{}');
 CREATE TABLE attendees(id uuid PRIMARY KEY,tenant_id uuid,event_id uuid,ticket_type_id uuid,order_id uuid,first_name text,last_name text,email text,ticket_code text UNIQUE,status text,checked_in_at timestamptz,checked_in_by text,metadata jsonb DEFAULT '{}');
 INSERT INTO tenants(id,slug,settings) VALUES('${tenant}','gangstarz','{"commerce":{"enabled":true,"mode":"test","pickup":{"instructions":"Collect at the merch desk"}}}'),('${other}','other','{}');
 INSERT INTO tenant_memberships VALUES('${tenant}','operator','owner',null),('${other}','outsider','owner',null);
 INSERT INTO events(id,tenant_id,name,slug,starts_at,status) VALUES('${event}','${tenant}','Verified fixture event','test-event',now()+interval '30 days','published');
 INSERT INTO ticket_types(id,tenant_id,event_id,name,price,quantity_total) VALUES('${ticket}','${tenant}','${event}','General admission',25.00,5);
 INSERT INTO products(id,tenant_id,name,slug,price,quantity,has_variants,published_at) VALUES('${product}','${tenant}','Test tee','test-tee',40.00,3,true,now());
 INSERT INTO product_variants(id,tenant_id,product_id,name,price,quantity,options) VALUES('${variant}','${tenant}','${product}','Medium',40.00,3,'{"size":"M"}');
 `);
 await db.exec(await readFile(new URL('../../db/gangstarz-commerce.sql',import.meta.url),'utf8'));
 const pool={connect:async()=>({query:async(sql:string,params?:unknown[])=>db.query(sql,params),release(){}})};
 return {db,pool};
}
export const buyer={email:'buyer@example.com',firstName:'Test',lastName:'Buyer'};
