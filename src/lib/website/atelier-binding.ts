type QueryClient={query:<Row=Record<string,unknown>>(sql:string,params?:unknown[])=>Promise<{rows:Row[]}>};
export async function findGangstarzAtelierSite(client:QueryClient,{tenantId,userId}:{tenantId:string;userId:string}):Promise<string|null>{
 const available=await client.query<{name:string|null}>("SELECT to_regclass('public.atelier_gangstarz_bindings') AS name");if(!available.rows[0]?.name)return null;
 const rows=await client.query<{site_id:string}>(`SELECT b.site_id FROM atelier_gangstarz_bindings b JOIN atelier_sites s ON s.id=b.site_id AND s.tenant_id=b.tenant_id JOIN tenants t ON t.id=b.tenant_id JOIN tenant_memberships m ON m.tenant_id=b.tenant_id AND m.user_id=$2 AND m.deleted_at IS NULL WHERE b.tenant_id=$1 AND b.active=true AND t.deleted_at IS NULL AND t.status::text NOT IN('suspended','cancelled')`,[tenantId,userId]);
 return rows.rows[0]?.site_id??null;
}
