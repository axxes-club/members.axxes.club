import{commerceRoutes}from'@/lib/commerce/routes';
export const dynamic='force-dynamic';
export async function POST(request:Request,context:{params:Promise<{slug:string}>}){if((await context.params).slug!=='gangstarz')return Response.json({error:'Store not found'},{status:404});return commerceRoutes.checkout(request);}
