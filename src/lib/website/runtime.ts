import { Pool } from 'pg';
import { WebsitePublication, type SqlPool } from './publication';
const globalState=globalThis as unknown as {websitePool?:Pool};
export const websitePool=globalState.websitePool??=new Pool({connectionString:process.env.DATABASE_URL,max:2,connectionTimeoutMillis:10000,idleTimeoutMillis:30000});
export const websitePublication=new WebsitePublication(websitePool as unknown as SqlPool);
