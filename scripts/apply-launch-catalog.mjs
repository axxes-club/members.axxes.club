import fs from 'node:fs'
import { neon } from '@neondatabase/serverless'
for (const line of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.*)$/)
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
}
if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL')
const sql = neon(process.env.DATABASE_URL)
await sql`update axxes_product set name='Matter',url='https://matter.axxes.club',updated_at=now() where key='matter'`
await sql`update axxes_product set status='beta',surface_in_members=true,updated_at=now() where key='keel'`
await sql`insert into axxes_product(key,name,tagline,description,url,color,category,status,sso,icon,surface_in_members,sort_order)
 values('binnacle','Binnacle','Every ticket explains itself','Support tickets with web intake, threaded replies, internal notes, SLA tracking, reports, and a signed customer view.','https://binnacle.axxes.club','#3ddc97','Support','beta',true,'LifeBuoy',true,40)
 on conflict(key) do update set name=excluded.name,tagline=excluded.tagline,description=excluded.description,url=excluded.url,status=excluded.status,sso=excluded.sso,surface_in_members=excluded.surface_in_members,updated_at=now()`
console.log('Matter, Keel, and Binnacle catalog launch entries updated')
