import {snapshotSchema,type SiteSnapshotV1} from './schema';
import {WebsiteError,type SqlPool} from './publication';
export async function seedGangstarz(pool:SqlPool,ownerId:string,input:SiteSnapshotV1):Promise<{tenantId:string;pageId:string;created:boolean}>{
 const data=snapshotSchema.parse(input);const c=await pool.connect();
 try{
  await c.query('BEGIN');
  if(!(await c.query<{id:string}>('SELECT id FROM "user" WHERE id=$1',[ownerId])).rows.length)throw new WebsiteError('Existing operator account required');
  const added=await c.query<{id:string}>(`INSERT INTO tenants(slug,name,owner_id,status,type,primary_color,logo_url,metadata) VALUES('gangstarz','Gangstarz Entertainment',$1,'active','promoter','#F48D25','https://gangstarz.axxes.club/media/logo.png',$2) ON CONFLICT(slug) DO NOTHING RETURNING id`,[ownerId,JSON.stringify({prospect:true,source:'https://gangstarzentertainment.com',websiteEditor:'gangstarz'})]);
  const existing=await c.query<{id:string;owner_id:string}>("SELECT id,owner_id FROM tenants WHERE slug='gangstarz' AND deleted_at IS NULL FOR UPDATE");
  const tenant=existing.rows[0];if(!tenant||tenant.owner_id!==ownerId)throw new WebsiteError('Gangstarz workspace is owned by another operator',403);
  const tenantId=tenant.id;
  if(!added.rows.length){const {rows}=await c.query<{id:string}>("SELECT id FROM pages WHERE tenant_id=$1 AND slug='home'",[tenantId]);if(!rows.length)throw new WebsiteError('Existing workspace requires reviewed initialization');await c.query('COMMIT');return {tenantId,pageId:rows[0].id,created:false}}
  await c.query("INSERT INTO tenant_memberships(tenant_id,user_id,role) VALUES($1,$2,'owner') ON CONFLICT(tenant_id,user_id) DO NOTHING",[tenantId,ownerId]);
  const page=await c.query<{id:string}>("INSERT INTO pages(tenant_id,title,slug,is_homepage,is_published) VALUES($1,$2,'home',true,true) RETURNING id",[tenantId,data.page.title]);
  const pageId=page.rows[0].id;data.page.id=pageId;data.revision=1;const json=JSON.stringify(data);
  for(const table of ['website_drafts','website_revisions'])await c.query(`INSERT INTO ${table}(page_id,tenant_id,revision,snapshot,actor_id) VALUES($1,$2,1,$3,$4)`,[pageId,tenantId,json,ownerId]);
  await c.query('INSERT INTO website_publications(page_id,tenant_id,revision,snapshot) VALUES($1,$2,1,$3)',[pageId,tenantId,json]);
  await c.query("INSERT INTO website_settings(tenant_id,custom_domain,subdomain) VALUES($1,'gangstarz.axxes.club','gangstarz') ON CONFLICT(tenant_id) DO NOTHING",[tenantId]);
  await c.query('COMMIT');return {tenantId,pageId,created:true};
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}
