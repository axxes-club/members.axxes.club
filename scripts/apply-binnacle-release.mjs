import fs from 'node:fs'
import { neon } from '@neondatabase/serverless'
for (const line of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.*)$/)
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
}
if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL')
const sql = neon(process.env.DATABASE_URL)
const statements = fs.readFileSync(new URL('../db/binnacle-release.sql', import.meta.url), 'utf8').replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean)
for (const statement of statements) await sql.query(statement)
const rows = await sql`select column_name,data_type from information_schema.columns where table_name='binnacle_tickets' and column_name in ('sla_paused_ms','first_response_paused_ms')`
if (rows.length !== 2 || rows.some(row => row.data_type !== 'bigint')) throw new Error('SLA migration did not complete')
console.log('Binnacle release schema applied and verified')
