import Link from 'next/link';
import { requireTenantAccess } from '@/lib/auth/tenant-context';
import { PulseFrame } from './pulse-frame';
export default async function PulsePage(){const {tenantId}=await requireTenantAccess();return <div><div className='mb-6 flex items-center justify-between gap-4'><div><h1 className='text-2xl font-semibold'>Pulse analytics</h1><p className='text-muted-foreground'>Your apps, traffic, and conversions in this organization.</p></div><Link className='text-sm underline' href={`https://pulse.axxes.app/api/organization/open?tenant=${tenantId}`} target='_blank' rel='noopener noreferrer'>Open Pulse ↗</Link></div><PulseFrame tenantId={tenantId}/></div>}
