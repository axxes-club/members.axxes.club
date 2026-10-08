import {wrapAdmission} from '@/lib/security/admission-server';
import{commerceRoutes}from'@/lib/commerce/routes';
export const dynamic='force-dynamic';
async function GETHandler(_request:Request,context:{params:Promise<{slug:string}>}){if((await context.params).slug!=='gangstarz')return Response.json({error:'Store not found'},{status:404});return commerceRoutes.catalog();}

export const GET=wrapAdmission(GETHandler,'src/app/api/v1/public/tenants/[slug]/commerce/catalog/route.ts'+':GET',12000);
