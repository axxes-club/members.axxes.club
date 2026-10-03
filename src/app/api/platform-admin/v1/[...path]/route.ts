import {runtimeAdmin} from '@/lib/platform-admin/runtime';
export const dynamic='force-dynamic';
export const GET=(request:Request)=>runtimeAdmin()(request);
export const POST=(request:Request)=>runtimeAdmin()(request);
