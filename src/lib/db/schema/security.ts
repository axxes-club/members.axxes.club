import {pgTable,text,integer,uuid,timestamp,primaryKey,index} from 'drizzle-orm/pg-core';
// Shared security infrastructure belongs to Members. Satellites use raw SQL without migrations.
export const securityRequestLimits=pgTable('security_request_limits',{
 service:text('service').notNull(),bucket:text('bucket').notNull(),count:integer('count').notNull(),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),
},table=>[primaryKey({columns:[table.service,table.bucket]}),index('security_request_limits_expiry_idx').on(table.expiresAt)]);
export const securityWebhookReceipts=pgTable('security_webhook_receipts',{
 provider:text('provider').notNull(),digest:text('digest').notNull(),leaseId:uuid('lease_id').notNull(),state:text('state').notNull(),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),
},table=>[primaryKey({columns:[table.provider,table.digest]}),index('security_webhook_receipts_expiry_idx').on(table.expiresAt)]);
