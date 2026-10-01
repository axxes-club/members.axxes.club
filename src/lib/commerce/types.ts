import { z } from 'zod';
export type SqlClient={query:(sql:string,params?:unknown[])=>Promise<{rows:any[]}>;release:()=>void};
export type SqlPool={connect:()=>Promise<SqlClient>};
export class CommerceError extends Error {constructor(message:string,public status=400){super(message)}}
export const uuid=z.string().uuid();
export const cartSchema=z.object({
 buyer:z.object({email:z.email().max(254),firstName:z.string().trim().min(1).max(80),lastName:z.string().trim().min(1).max(80)}),
 items:z.array(z.object({kind:z.enum(['ticket','product']),id:uuid,variantId:uuid.optional(),quantity:z.number().int().min(1).max(99)})).min(1).max(20),
 fulfillment:z.enum(['pickup','shipping']).optional(),
 shippingAddress:z.object({line1:z.string().trim().min(1).max(150),line2:z.string().trim().max(150).optional(),city:z.string().trim().min(1).max(80),state:z.string().trim().max(80),postalCode:z.string().trim().min(1).max(30),country:z.string().length(2)}).optional(),
});
export type CartInput=z.infer<typeof cartSchema>;
export type Checkout={id:string;tenantId:string;mode:'test'|'live';amount:number;currency:'usd';state:string;token:string;paymentId:string|null;checkoutUrl:string|null};
export type Policy={enabled?:boolean;mode?:'test'|'live';taxBps?:number;pickup?:{instructions:string};shipping?:{flatCents:number;countries:string[]}};
export type Line={kind:'ticket'|'product';id:string;resourceId:string;variantId?:string;eventId?:string;name:string;quantity:number;unitAmount:number};
export function cents(value:unknown):number {
 const text=String(value);if(!/^\d+(\.\d{1,2})?$/.test(text))throw new CommerceError('Invalid configured price');
 const [whole,fraction='']=text.split('.');const n=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(n)||n<0||n>99_999_999)throw new CommerceError('Invalid configured price');return n;
}
export async function transaction<T>(pool:SqlPool,fn:(client:SqlClient)=>Promise<T>):Promise<T>{
 const c=await pool.connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}
