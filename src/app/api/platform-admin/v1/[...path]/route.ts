import {wrapAdmission} from '@/lib/security/admission-server';
import {runtimeAdmin} from '@/lib/platform-admin/runtime';
export const dynamic='force-dynamic';
export const GET=wrapAdmission((request:Request)=>runtimeAdmin()(request),'platform-admin-read');
export const POST=wrapAdmission((request:Request)=>runtimeAdmin()(request),'platform-admin-write',3000);
