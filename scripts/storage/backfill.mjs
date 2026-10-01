// Explicit operator tool. Reports counts only; never prints source rows or credentials.
import {Pool} from 'pg';import{Storage}from'@google-cloud/storage';
import{createRequire}from'node:module';import{execFileSync}from'node:child_process';
import{loadAliases}from'../../src/lib/gcs/aliases.mjs';import{objectKeyFromUrl}from'../../src/lib/gcs/core.mjs';
import{planBackfill}from'../../src/lib/storage/backfill.mjs';import{lockAccount}from'../../src/lib/storage/quota.mjs';
if(process.env.STORAGE_BACKFILL_READY!=='folders-owned-review'||!process.env.DATABASE_URL)throw Error('Explicit storage backfill scope and database required');
const require=createRequire(import.meta.url),{OAuth2Client}=require(require.resolve('google-auth-library',{paths:[require.resolve('@google-cloud/storage')]}));
const authClient=new OAuth2Client();authClient.setCredentials({access_token:execFileSync('gcloud',['auth','print-access-token'],{stdio:['ignore','pipe','pipe']}).toString().trim()});
const storage=new Storage({authClient}),bucketName=process.env.GCS_ASSETS_BUCKET||'gravy-meta-axxes-production-assets',bucket=storage.bucket(bucketName);
const pool=new Pool({connectionString:process.env.DATABASE_URL,max:2}),client=await pool.connect();
try{
 const state=await loadAliases({storage,bucket:bucketName})();
 const objects=[];for(const prefix of ['imports/','uploads/dam/','uploads/members/']){const[files]=await bucket.getFiles({prefix});for(const file of files)objects.push({key:file.name,generation:String(file.metadata.generation),size:Number(file.metadata.size)});}
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const {rows:rows}=await client.query('SELECT id,tenant_id,url FROM assets');const{rows:receipts}=await client.query('SELECT owner,document,result FROM gcp_asset_uploads WHERE result IS NOT NULL');await client.query('COMMIT');
 const assets=rows.map(row=>({id:row.id,tenantId:row.tenant_id,objectKey:objectKeyFromUrl(row.url,{bucket:bucketName,origins:['https://dam.axxes.club','https://folders.axxes.club','https://members.axxes.club'],aliases:state.aliases,verifiedKeys:state.verifiedKeys})})).filter(a=>a.objectKey);
 const plan=planBackfill({assets,objects,receipts});
 if(process.argv.includes('--apply')){
  await client.query('BEGIN');
  for(const item of [...plan.attributed].sort((a,b)=>(a.tenantId+a.userId).localeCompare(b.tenantId+b.userId))){
   const key={tenantId:item.tenantId,userId:item.userId};await lockAccount(client,key);
   const{rowCount}=await client.query('INSERT INTO storage_object_charges(object_key,generation,tenant_id,user_id,bytes) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[item.objectKey,item.generation,item.tenantId,item.userId,item.bytes]);
   if(rowCount)await client.query('UPDATE storage_accounts SET used_bytes=used_bytes+$3 WHERE tenant_id=$1 AND user_id=$2',[key.tenantId,key.userId,item.bytes]);
  }
  // Reference links retain physical bytes even for existing shared views.
  for(const asset of assets)await client.query('INSERT INTO storage_asset_links(asset_id,object_key,generation) SELECT $1,object_key,generation FROM storage_object_charges WHERE object_key=$2 AND released_at IS NULL ON CONFLICT DO NOTHING',[asset.id,asset.objectKey]);
  for(const item of plan.legacy)await client.query('INSERT INTO storage_legacy_usage(tenant_id,object_key,generation,bytes) VALUES($1,$2,$3,$4) ON CONFLICT(tenant_id,object_key,generation) DO UPDATE SET bytes=EXCLUDED.bytes',[item.tenantId,item.objectKey,item.generation,item.bytes]);
  await client.query('COMMIT');
 }
 console.log(JSON.stringify({mode:process.argv.includes('--apply')?'apply':'dry-run',attributedObjects:plan.attributed.length,legacyReferences:plan.legacy.length,unmappedReferences:rows.length-assets.length,customerRowsLogged:false}));
}catch(error){await client.query('ROLLBACK');console.error(JSON.stringify({backfillFailed:true,code:error.code??'BACKFILL_FAILED'}));process.exitCode=1;}finally{client.release();await pool.end();}
