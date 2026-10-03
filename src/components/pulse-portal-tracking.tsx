import { cookies,headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { PulseTracker } from './pulse-tracker';
export async function PulsePortalTracking(){try{const tenant=(await cookies()).get('tenant_id')?.value;if(!tenant)return null;const session=await auth.api.getSession({headers:await headers()});if(!session)return null;return <PulseTracker appKey='suite' tenantId={tenant} userId={session.user.id}/>;}catch{return null}}
