import {z} from 'zod';
const signedBigintMax=BigInt('9223372036854775807');
const packageSchema=z.object({id:z.string().regex(/^[a-z0-9][a-z0-9_-]{1,63}$/),name:z.string().trim().min(1).max(100),bytes:z.string().regex(/^[1-9][0-9]*$/).refine(value=>BigInt(value)<=signedBigintMax),amountCents:z.number().int().min(50).max(99999999),currency:z.literal('usd'),cadence:z.literal('one_time'),validForSeconds:z.number().int().positive().max(315576000).nullable(),refundPolicy:z.literal('revoke_on_full_refund')}).strict();
const catalogSchema=z.object({published:z.literal(true),packages:z.array(packageSchema).min(1).max(50).refine(items=>new Set(items.map(item=>item.id)).size===items.length)}).strict();
export type StoragePackage=z.infer<typeof packageSchema>;
export type StorageCatalog={published:boolean;packages:StoragePackage[]};
// Commercial terms are operator supplied. No implicit price, size, duration, or recurrence.
export function storageCatalog(raw:string|undefined=process.env.STORAGE_BILLING_CATALOG):StorageCatalog{if(!raw)return{published:false,packages:[]};try{const result=catalogSchema.safeParse(JSON.parse(raw));return result.success?result.data:{published:false,packages:[]};}catch{return{published:false,packages:[]};}}
