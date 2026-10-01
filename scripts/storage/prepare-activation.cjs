// Preparation only: emits reviewed narrow SQL; never connects or applies it.
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const fragments=[];
if(process.argv.includes('--include-ownership')){
 let sql=read('scripts/folders-ownership.sql').replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,'');
 // Preserve all customer rows. Historical key/folder backfills require separate reviewed activation.
 sql=sql.replace(/^UPDATE assets SET storage_key=.*;\s*$/m,'').replace(/^INSERT INTO asset_folders\(library_id,tenant_id,path\).*;\s*$/m,'');
 sql=sql.replace('ALTER TABLE assets ADD CONSTRAINT assets_owner_exactly_one CHECK ((tenant_id IS NULL) <> (owner_user_id IS NULL));',()=>"DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='assets'::regclass AND conname='assets_owner_exactly_one') THEN ALTER TABLE assets ADD CONSTRAINT assets_owner_exactly_one CHECK ((tenant_id IS NULL) <> (owner_user_id IS NULL)) NOT VALID; END IF; END $$;\nALTER TABLE assets VALIDATE CONSTRAINT assets_owner_exactly_one;");
 fragments.push({file:'scripts/folders-ownership.sql (DDL only, idempotent constraint)',sql});
}
if(process.argv.includes('--include-office')){
 const source=read('drizzle/0005_office_folders_service.sql');
 const archive=source.slice(0,source.indexOf('--> statement-breakpoint'));
 const tables=source.slice(source.indexOf('CREATE TABLE IF NOT EXISTS office_service_requests'));
 fragments.push({file:'drizzle/0005_office_folders_service.sql (additive tables only; no reconciliation/delete)',sql:archive+'\n'+tables+'\nCREATE UNIQUE INDEX IF NOT EXISTS office_asset_canonical_idx ON asset_app_links (tenant_id, app_key, record_id) WHERE app_key=\'office\';'});
}
for(const file of ['drizzle/0005_storage_allowances.sql','drizzle/0006_workspace_outbox.sql',...(process.argv.includes('--include-commerce')?['db/gangstarz-commerce.sql']:[])])fragments.push({file,sql:read(file)});
const output=["-- Explicit reviewed additive activation; no customer backfill/delete, whole-schema push or journal rewrite.","-- Apply only after checking current authoritative DB and coordinating other writers.","BEGIN;","SET LOCAL lock_timeout='5s';","SET LOCAL statement_timeout='60s';","SELECT pg_advisory_xact_lock(hashtext('axxes-storage-main-20261001'));"];
for(const {file,sql}of fragments)output.push('-- '+file+' sha256='+crypto.createHash('sha256').update(sql).digest('hex'),sql);
output.push('COMMIT;');process.stdout.write(output.join('\n')+'\n');
