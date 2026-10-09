import {wrapAdmission} from '@/lib/security/admission-server';
import{commerceRoutes}from'@/lib/commerce/routes';
export const dynamic='force-dynamic';
async function GETHandler(request:Request,context:{params:Promise<{slug:string;id:string}>}){const params=await context.params;if(params.slug!=='gangstarz')return Response.json({error:'Store not found'},{status:404});return commerceRoutes.receipt(request,params.id);}

export const GET=wrapAdmission(GETHandler,'src/app/api/v1/public/tenants/[slug]/commerce/receipts/[id]/route.ts'+':GET',12000);
