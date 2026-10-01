import{QuotaError}from'./quota.mjs';
export async function verifyStorageService(request,{audience,serviceAccount,verifyToken}) {
 const authorization=request.headers.get('authorization')??'';
 if(!/^Bearer [A-Za-z0-9._~-]+$/.test(authorization)||authorization.length>8192)throw new QuotaError('Service access denied',403);
 const claims=await verifyToken(authorization.slice(7));
 if(!claims||claims.aud!==audience||!['accounts.google.com','https://accounts.google.com'].includes(claims.iss)||claims.email!==serviceAccount||claims.email_verified!==true)throw new QuotaError('Service access denied',403);
}
