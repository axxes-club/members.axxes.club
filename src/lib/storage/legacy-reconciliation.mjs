// Call within the reviewed caller-owned transaction. No asset/object/account mutation.
export async function reconcileLegacyLedgers(client,{legacy,assets}){
 const items=[...new Map(legacy.map(item=>[item.tenantId+'\0'+item.objectKey+'\0'+item.generation,item])).values()];
 const payload=JSON.stringify(items),links=JSON.stringify(assets.map(asset=>({id:asset.id,objectKey:asset.objectKey})));
 await client.query('INSERT INTO storage_asset_links(asset_id,object_key,generation) SELECT a.id,c.object_key,c.generation FROM jsonb_to_recordset($1::jsonb) AS x(id uuid,"objectKey" text) JOIN assets a ON a.id=x.id JOIN storage_object_charges c ON c.object_key=x."objectKey" WHERE c.released_at IS NULL ON CONFLICT DO NOTHING',[links]);
 await client.query('INSERT INTO storage_legacy_usage(tenant_id,object_key,generation,bytes) SELECT t.id,x."objectKey",x.generation,x.bytes FROM jsonb_to_recordset($1::jsonb) AS x("tenantId" uuid,"objectKey" text,generation text,bytes bigint) JOIN tenants t ON t.id=x."tenantId" ON CONFLICT(tenant_id,object_key,generation) DO UPDATE SET bytes=EXCLUDED.bytes',[payload]);
 const {rows:[verified]}=await client.query('SELECT count(*)::int AS count,coalesce(sum(l.bytes),0)::text AS bytes FROM jsonb_to_recordset($1::jsonb) AS x("tenantId" uuid,"objectKey" text,generation text,bytes bigint) JOIN storage_legacy_usage l ON l.tenant_id=x."tenantId" AND l.object_key=x."objectKey" AND l.generation=x.generation AND l.bytes=x.bytes',[payload]);
 const bytes=items.reduce((sum,item)=>sum+BigInt(item.bytes),0n).toString();if(verified.count!==items.length||verified.bytes!==bytes)throw Error('Legacy reconciliation counts or decimal bytes differ');
 return{legacyObjects:verified.count,legacyBytes:bytes};
}
