import {redirect} from 'next/navigation';
import {requireTenantAccess} from '@/lib/auth/tenant-context';
import {websitePool} from '@/lib/website/runtime';
import {findGangstarzAtelierSite} from '@/lib/website/atelier-binding';
import {GangstarzEditor} from './editor';
export default async function Page(){const {tenantId,userId}=await requireTenantAccess();const site=await findGangstarzAtelierSite(websitePool,{tenantId,userId});if(site)redirect(`https://atelier.axxes.app/api/organization/open?tenant=${tenantId}&site=${site}`);return <GangstarzEditor/>;}
