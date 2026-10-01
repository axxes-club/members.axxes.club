import{storagePool}from'../storage/database';import{CommerceOrders}from'./orders';import{CommerceAdministration}from'./administration';import{CommerceMerchant}from'./merchant';import{CommercePayments}from'./payments';import{CommerceError,type SqlPool,type Policy}from'./types';
const pool=storagePool() as unknown as SqlPool;
const secret=process.env.COMMERCE_CREDENTIAL_KEY||process.env.BETTER_AUTH_SECRET||'';
export const commerceOrders=new CommerceOrders(pool,{receiptSecret:secret});
export const commerceAdmin=new CommerceAdministration(pool,commerceOrders);
export const commerceMerchant=new CommerceMerchant(pool,commerceAdmin,secret);
export async function gangstarzCommerce(){const client=await pool.connect();try{const row=(await client.query<{id:string;settings:{commerce?:Policy}}>("SELECT id,settings FROM tenants WHERE slug='gangstarz' AND status='active' AND deleted_at IS NULL")).rows[0];if(!row)throw new CommerceError('Store not found',404);return{tenantId:row.id,policy:row.settings?.commerce??{enabled:false}};}finally{client.release();}}
export async function commercePayments(mode:'test'|'live',verify=true){const context=await gangstarzCommerce(),merchant=await commerceMerchant.get(context.tenantId,mode,verify);return{...context,...merchant,payments:new CommercePayments(pool,commerceOrders,merchant.gateway)};}
