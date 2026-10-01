const fs=require('node:fs');
// Read-only production audit. Reads only the secrets mounted by the active services.
const {execFileSync}=require('node:child_process');
const {parseEnv}=require('node:util');
const {createHash}=require('node:crypto');
const {Client}=require('pg');
const tables=['storage_accounts','storage_reservations','storage_object_charges','storage_asset_links','storage_entitlements','storage_billing_events','storage_override_audit','storage_legacy_usage','workspace_membership_outbox','website_drafts','website_revisions','website_publications','commerce_checkouts','commerce_reservations','commerce_notifications','gcp_asset_uploads','assets','asset_folders','folder_storage_cleanup','folder_grants','asset_app_grants','folders_upload_intents','asset_ownership_events','upload_sessions','office_service_requests','office_uploads','office_link_reconciliations','ticket_types','products','product_variants'];
const gcloud=args=>JSON.parse(execFileSync('gcloud',args.concat('--format=json'),{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
(async()=>{for(const service of ['members','dam']){
 const runtime=gcloud(['run','services','describe',service,'--project=gravy-meta','--region=us-west1']);
 const spec=runtime.spec.template.spec,container=spec.containers[0];
 const mount=container.volumeMounts.find(m=>m.mountPath==='/secrets');
 const secret=spec.volumes.find(v=>v.name===mount.name).secret;
 const version=secret.items.find(i=>i.path==='env').key;
 const env=parseEnv(execFileSync('gcloud',['secrets','versions','access',version,'--project=gravy-meta','--secret='+secret.secretName],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 const url=new URL(env.DATABASE_URL);
 const authority=url.hostname.endsWith('.neon.tech')?'neon':url.searchParams.get('host')?.startsWith('/cloudsql/')?'cloudsql':'other';
 const db=new Client({connectionString:env.DATABASE_URL,connectionTimeoutMillis:15000});
 const report={service,revision:runtime.status.latestReadyRevisionName,secretName:secret.secretName,secretVersion:version,authority,database:url.pathname.slice(1),endpointFingerprint:createHash('sha256').update(url.hostname+url.pathname+(url.searchParams.get('host')??'')).digest('hex'),quotaMode:container.env?.find(e=>e.name==='STORAGE_QUOTA_MODE')?.value??env.STORAGE_QUOTA_MODE??'off'};
 try{await db.connect();await db.query('BEGIN READ ONLY');await db.query("SET LOCAL statement_timeout='15000ms'");
 const result=await db.query("SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[]) ORDER BY table_name,ordinal_position",[tables]);
 report.tables=Object.fromEntries(tables.map(t=>[t,result.rows.filter(r=>r.table_name===t).map(r=>({column:r.column_name,type:r.data_type}))]));
 report.triggers=(await db.query("SELECT trigger_name,event_object_table FROM information_schema.triggers WHERE trigger_schema='public' AND trigger_name IN ('storage_asset_reference_trigger','workspace_membership_event','workspace_tenant_event') ORDER BY trigger_name")).rows;
 report.officeDuplicateGroups=Number((await db.query("SELECT count(*) FROM (SELECT 1 FROM asset_app_links WHERE app_key='office' GROUP BY tenant_id,app_key,record_id HAVING count(*)>1) duplicates")).rows[0].count);
 report.migrationJournalPresent=(await db.query("SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS present")).rows[0].present;
 const tenant=(await db.query("SELECT id FROM tenants WHERE slug='gangstarz' AND deleted_at IS NULL")).rows;
 report.gangstarz={tenantCount:tenant.length,configuredOperator:!!env.GANGSTARZ_OPERATOR_EMAIL};
 if(tenant.length===1){report.gangstarz.activeOwners=Number((await db.query("SELECT count(*) FROM tenant_memberships m JOIN \"user\" u ON u.id=m.user_id WHERE m.tenant_id=$1 AND m.deleted_at IS NULL AND m.role='owner'",[tenant[0].id])).rows[0].count);if(report.tables.website_publications.length){report.gangstarz.publishedPages=Number((await db.query('SELECT count(*) FROM website_publications WHERE tenant_id=$1',[tenant[0].id])).rows[0].count);report.gangstarz.publicationStates=(await db.query('SELECT p.slug,p.is_published,w.revision FROM website_publications w JOIN pages p ON p.id=w.page_id AND p.tenant_id=w.tenant_id WHERE w.tenant_id=$1',[tenant[0].id])).rows;}}
 if(service==='members' && process.argv.includes('--operator-report') && tenant.length===1 && report.tables.website_drafts.length){
 const path=process.argv[process.argv.indexOf('--operator-report')+1];
 if(!path || !path.startsWith('/'))throw new Error('Absolute private operator-report path required');
 const candidates=(await db.query('SELECT DISTINCT u.id,u.email,m.role FROM website_drafts w JOIN "user" u ON u.id=w.actor_id JOIN tenant_memberships m ON m.tenant_id=w.tenant_id AND m.user_id=u.id AND m.deleted_at IS NULL WHERE w.tenant_id=$1 AND m.role IN (\'owner\',\'admin\')',[tenant[0].id])).rows;
 fs.writeFileSync(path,JSON.stringify({existingAuthenticatedDraftEditors:candidates},null,2),{mode:0o600});
 report.gangstarz.existingPrivilegedDraftEditors=candidates.length;
 }
 await db.query('ROLLBACK');console.log(JSON.stringify(report));
 }catch(error){console.log(JSON.stringify({...report,errorCode:error.code??'CONNECTION_FAILED'}));process.exitCode=1;}finally{await db.end().catch(()=>{});}
}})().catch(()=>{console.error('Read-only activation audit failed; no credentials printed.');process.exitCode=1});
