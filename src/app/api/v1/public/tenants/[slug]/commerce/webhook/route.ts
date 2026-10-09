import {wrapAdmission} from '@/lib/security/admission-server';
import{commerceRoutes}from'@/lib/commerce/routes';
export const dynamic='force-dynamic';
async function POSTHandler(request:Request,context:{params:Promise<{slug:string}>}){if((await context.params).slug!=='gangstarz')return Response.json({error:'Store not found'},{status:404});return commerceRoutes.webhook(request);}

export const POST=wrapAdmission(POSTHandler,'src/app/api/v1/public/tenants/[slug]/commerce/webhook/route.ts'+':POST',3000);
