import{commerceRoutes}from'@/lib/commerce/routes';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{slug:string;id:string}>}){const params=await context.params;if(params.slug!=='gangstarz')return Response.json({error:'Store not found'},{status:404});return commerceRoutes.receipt(request,params.id);}
