import {websitePool} from './runtime';
// Pages edited through a structured site editor (e.g. Gangstarz) keep their content in
// website_drafts/website_publications, not page_blocks. The generic block editor would show
// them as empty, and its page-level actions would take the live site down.
const editors:Record<string,string>={gangstarz:'/website/gangstarz'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function structuredEditorPath(tenantId:string,pageId:string,pool:{query:(sql:string,params?:unknown[])=>Promise<{rows:{slug:string}[]}>}=websitePool):Promise<string|null>{
 if(!uuid.test(pageId)||!uuid.test(tenantId))return null;
 const {rows}=await pool.query('SELECT t.slug FROM website_drafts d JOIN tenants t ON t.id=d.tenant_id WHERE d.page_id=$1 AND d.tenant_id=$2',[pageId,tenantId]);
 return rows.length?editors[rows[0].slug]??null:null;
}
export async function assertNotStructuredPage(tenantId:string,pageId:string){
 if(await structuredEditorPath(tenantId,pageId))throw new Error('This page is managed by the site editor. Open Website to edit, publish or unpublish it.');
}
