import {redirect} from 'next/navigation';
import {getAuthContext} from '@/lib/auth';
import {websitePool} from '@/lib/website/runtime';
export default async function WebsitePage(){const {tenantId}=await getAuthContext();const {rows}=await websitePool.query('SELECT slug FROM tenants WHERE id=$1',[tenantId]);redirect(rows[0]?.slug==='gangstarz'?'/website/gangstarz':'/website/pages')}
