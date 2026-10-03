import {cookies,headers} from 'next/headers';
import {auth} from '@/lib/auth';
import {PulseTracker} from './pulse-tracker';
export async function PulsePortalTracking(){
 let tenant:string|undefined,userId:string|undefined;
 try{tenant=(await cookies()).get('tenant_id')?.value;userId=(await auth.api.getSession({headers:await headers()}))?.user.id}catch{return null}
 return tenant&&userId?<PulseTracker appKey="suite" tenantId={tenant} userId={userId}/>:null;
}
