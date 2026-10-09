import {wrapAdmission} from '@/lib/security/admission-server';
import {NextResponse} from 'next/server';
import {websitePublication} from '@/lib/website/runtime';
export const dynamic='force-dynamic';
async function GETHandler(_request:Request,{params}:{params:Promise<{slug:string;pageSlug:string}>}){
 const {slug,pageSlug}=await params;
 try{const data=await websitePublication.publicPage(slug,pageSlug);return NextResponse.json(data??{error:'Page not found'},{status:data?200:404,headers:{'Cache-Control':'no-store'}})}
 catch{console.error('Website publication lookup failed');return NextResponse.json({error:'Website temporarily unavailable'},{status:503})}
}

export const GET=wrapAdmission(GETHandler,'src/app/api/v1/public/tenants/[slug]/website/[pageSlug]/route.ts'+':GET',12000);
