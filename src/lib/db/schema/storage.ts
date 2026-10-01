import {pgTable,uuid,text,timestamp,primaryKey,customType} from 'drizzle-orm/pg-core';
const byteString=customType<{data:string;driverData:string}>({dataType(){return 'bigint';}});
export const storageAccounts=pgTable('storage_accounts',{
 tenantId:uuid('tenant_id').notNull(),userId:text('user_id').notNull(),
 baseBytes:byteString('base_bytes').notNull().default('5000000000'),
 usedBytes:byteString('used_bytes').notNull().default('0'),reservedBytes:byteString('reserved_bytes').notNull().default('0'),
 updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow()
},t=>[primaryKey({columns:[t.tenantId,t.userId]})]);
