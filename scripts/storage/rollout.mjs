import {pathToFileURL} from 'node:url';
export function accountingReadiness({accounts,missingLinks,orphanCharges}){const divergentAccounts=accounts.filter(row=>BigInt(row.used_bytes)!==BigInt(row.charged_bytes)||BigInt(row.reserved_bytes)!==BigInt(row.pending_bytes)).length;return{ready:divergentAccounts===0&&missingLinks===0&&orphanCharges===0,accounts:accounts.length,divergentAccounts,missingLinks,orphanCharges};}
async function main(){
 if(!process.env.DATABASE_URL||process.env.STORAGE_ROLLOUT_AUDIT!=='read-only')throw Error('Explicit read-only rollout audit required');
 const {Client}=await import('pg');const client=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:15000});
 try{await client.connect();await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await client.query("SET LOCAL statement_timeout='30000ms'");
 const accounts=(await client.query("SELECT a.used_bytes::text,a.reserved_bytes::text,coalesce((SELECT sum(c.bytes) FROM storage_object_charges c WHERE c.tenant_id=a.tenant_id AND c.user_id=a.user_id AND c.released_at IS NULL),0)::text charged_bytes,coalesce((SELECT sum(r.bytes) FROM storage_reservations r WHERE r.tenant_id=a.tenant_id AND r.user_id=a.user_id AND r.state='pending'),0)::text pending_bytes FROM storage_accounts a")).rows;
 const missingLinks=Number((await client.query('SELECT count(*) n FROM storage_asset_links l LEFT JOIN storage_object_charges c ON c.object_key=l.object_key AND c.generation=l.generation WHERE c.object_key IS NULL OR c.released_at IS NOT NULL')).rows[0].n);
 const orphanCharges=Number((await client.query('SELECT count(*) n FROM storage_object_charges c LEFT JOIN storage_accounts a ON a.tenant_id=c.tenant_id AND a.user_id=c.user_id WHERE c.user_id IS NOT NULL AND c.released_at IS NULL AND a.user_id IS NULL')).rows[0].n);
 const legacyReferences=Number((await client.query('SELECT count(*) n FROM storage_legacy_usage')).rows[0].n);
 await client.query('ROLLBACK');const report=accountingReadiness({accounts,missingLinks,orphanCharges});console.log(JSON.stringify({...report,legacyReferences,mode:'read-only',physicalProvenanceBackfillRequired:true}));if(!report.ready)process.exitCode=1;
 }finally{await client.end();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error('Storage rollout audit failed; no credentials or customer data logged');process.exitCode=1;});
