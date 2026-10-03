import { snapshotSchema, type SiteSnapshotV1 } from './schema';
export type Principal={tenantId:string;userId:string};
export type WebsiteRow={id:string;slug:string;role:string;revision:number;snapshot:unknown;created_at:string};
export type SqlClient={query:<Row=Record<string,unknown>>(sql:string,params?:unknown[])=>Promise<{rows:Row[]}>;release:()=>void};
export type SqlPool={connect:()=>Promise<SqlClient>};
export class WebsiteError extends Error { constructor(message:string,public status=400){super(message)} }
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class WebsitePublication {
 constructor(private pool:SqlPool){}
 private async authorize(c:SqlClient,p:Principal,pageId:string,write=false){
  if(!uuid.test(pageId)||!uuid.test(p.tenantId))throw new WebsiteError('Invalid identifier');
  const {rows}=await c.query<Pick<WebsiteRow,'id'|'slug'|'role'>>(`SELECT p.id,p.slug,m.role FROM pages p JOIN tenants org ON org.id=p.tenant_id AND org.deleted_at IS NULL AND org.status='active' JOIN tenant_memberships m ON m.tenant_id=p.tenant_id AND m.user_id=$2 AND m.deleted_at IS NULL WHERE p.id=$1 AND p.tenant_id=$3`,[pageId,p.userId,p.tenantId]);
  if(!rows.length)throw new WebsiteError('Page not found or access denied',403);
  if(write&&!['owner','admin','manager'].includes(rows[0].role))throw new WebsiteError('Permission denied',403);
  return rows[0];
 }
 private async transaction<T>(fn:(c:SqlClient)=>Promise<T>):Promise<T>{
  const c=await this.pool.connect();
  try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result}
  catch(error){await c.query('ROLLBACK');throw error}finally{c.release()}
 }
 private validate(data:unknown,pageId:string):SiteSnapshotV1{
  if(JSON.stringify(data).length>1_000_000)throw new WebsiteError('Page content too large');
  const parsed=snapshotSchema.safeParse(data);
  if(!parsed.success)throw new WebsiteError('Invalid website content');
  if(parsed.data.page.id!==pageId)throw new WebsiteError('Page identifier mismatch');
  if(new Set(parsed.data.blocks.map(b=>b.id)).size!==parsed.data.blocks.length)throw new WebsiteError('Duplicate block identifiers');
  if(parsed.data.blocks.some(b=>b.type==='html'||b.type==='video'&&String(b.content.url||'').startsWith('javascript:')))throw new WebsiteError('Unsafe block content');
  const check=(value:unknown,key='')=>{
   if(typeof value==='string'&&/(url|href|link|image|backgroundImage)$/i.test(key)&&value&&!/^(https:\/\/|\/[^\/]|#[\w-]+$|mailto:|tel:)/.test(value))throw new WebsiteError('Unsafe content URL');
   if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))check(v,k);
  };check(parsed.data);
  return parsed.data;
 }
 private async saveIn(c:SqlClient,p:Principal,pageId:string,data:unknown,expected:number):Promise<number>{
  const owned=await this.authorize(c,p,pageId,true);
  if(!Number.isInteger(expected)||expected<0)throw new WebsiteError('Invalid revision');
  const snapshot=this.validate(data,pageId);
  await c.query('SELECT id FROM pages WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[pageId,p.tenantId]);
  const current=await c.query<{revision:number}>('SELECT revision FROM website_drafts WHERE page_id=$1 AND tenant_id=$2',[pageId,p.tenantId]);
  if((current.rows[0]?.revision??0)!==expected)throw new WebsiteError('Revision conflict. Reload before saving.',409);
  const revision=expected+1;
  snapshot.revision=revision;snapshot.page.slug=owned.slug;
  const json=JSON.stringify(snapshot);
  await c.query('INSERT INTO website_drafts(page_id,tenant_id,revision,snapshot,actor_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(page_id) DO UPDATE SET revision=excluded.revision,snapshot=excluded.snapshot,actor_id=excluded.actor_id,updated_at=now()',[pageId,p.tenantId,revision,json,p.userId]);
  await c.query('INSERT INTO website_revisions(page_id,tenant_id,revision,snapshot,actor_id) VALUES($1,$2,$3,$4,$5)',[pageId,p.tenantId,revision,json,p.userId]);
  return revision;
 }
 async save(p:Principal,pageId:string,data:unknown,expected:number):Promise<number>{return this.transaction(c=>this.saveIn(c,p,pageId,data,expected))}
 async publish(p:Principal,pageId:string,expected:number):Promise<number>{return this.transaction(async c=>{
  await this.authorize(c,p,pageId,true);
  await c.query('SELECT id FROM pages WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[pageId,p.tenantId]);
  const {rows}=await c.query<{revision:number;snapshot:unknown}>('SELECT revision,snapshot FROM website_drafts WHERE page_id=$1 AND tenant_id=$2',[pageId,p.tenantId]);
  if(!rows.length)throw new WebsiteError('Save a draft before publishing');
  if(rows[0].revision!==expected)throw new WebsiteError('Revision conflict. Reload before publishing.',409);
  const data=this.validate(rows[0].snapshot,pageId);
  data.blocks=data.blocks.filter(b=>b.isVisible).sort((a,b)=>a.sortOrder-b.sortOrder);
  await c.query('INSERT INTO website_publications(page_id,tenant_id,revision,snapshot) VALUES($1,$2,$3,$4) ON CONFLICT(page_id) DO UPDATE SET revision=excluded.revision,snapshot=excluded.snapshot,published_at=now()',[pageId,p.tenantId,expected,JSON.stringify(data)]);
  await c.query('UPDATE pages SET is_published=true WHERE id=$1 AND tenant_id=$2',[pageId,p.tenantId]);
  return expected;
 })}
 async restore(p:Principal,pageId:string,revision:number,expected:number):Promise<number>{return this.transaction(async c=>{
  await this.authorize(c,p,pageId,true);
  const {rows}=await c.query<{snapshot:unknown}>('SELECT snapshot FROM website_revisions WHERE page_id=$1 AND tenant_id=$2 AND revision=$3',[pageId,p.tenantId,revision]);
  if(!rows.length)throw new WebsiteError('Revision not found',404);
  return this.saveIn(c,p,pageId,rows[0].snapshot,expected);
 })}
 async draft(p:Principal,pageId:string):Promise<SiteSnapshotV1>{
  const c=await this.pool.connect();try{await this.authorize(c,p,pageId);const {rows}=await c.query<{snapshot:unknown}>('SELECT snapshot FROM website_drafts WHERE page_id=$1 AND tenant_id=$2',[pageId,p.tenantId]);if(!rows.length)throw new WebsiteError('Draft not found',404);return snapshotSchema.parse(rows[0].snapshot)}finally{c.release()}
 }
 async unpublish(p:Principal,pageId:string):Promise<void>{await this.transaction(async c=>{await this.authorize(c,p,pageId,true);await c.query('DELETE FROM website_publications WHERE page_id=$1 AND tenant_id=$2',[pageId,p.tenantId]);await c.query('UPDATE pages SET is_published=false WHERE id=$1 AND tenant_id=$2',[pageId,p.tenantId])})}
 async publicPage(slug:string,pageSlug:string):Promise<SiteSnapshotV1|null>{
  const c=await this.pool.connect();try{
   const {rows}=await c.query<{snapshot:unknown}>('SELECT w.snapshot FROM website_publications w JOIN pages p ON p.id=w.page_id AND p.tenant_id=w.tenant_id JOIN tenants t ON t.id=w.tenant_id WHERE t.slug=$1 AND p.slug=$2 AND p.is_published=true',[slug,pageSlug]);
   if(!rows.length)return null;const parsed=snapshotSchema.parse(rows[0].snapshot);parsed.blocks=parsed.blocks.filter(b=>b.isVisible);return parsed;
  }finally{c.release()}
 }
 async history(p:Principal,pageId:string):Promise<{revision:number;created_at:string}[]>{const c=await this.pool.connect();try{await this.authorize(c,p,pageId);return (await c.query<{revision:number;created_at:string}>('SELECT revision,created_at FROM website_revisions WHERE page_id=$1 AND tenant_id=$2 ORDER BY revision DESC LIMIT 50',[pageId,p.tenantId])).rows}finally{c.release()}}
}
