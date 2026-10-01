import{test}from'node:test';import assert from'node:assert/strict';import{verifyStorageService}from'../../src/lib/storage/service-identity.mjs';
const audience='https://members.axxes.club',serviceAccount='webmaster-runtime@gravy-meta.iam.gserviceaccount.com';
const request=new Request(audience+'/api/internal/storage',{headers:{authorization:'Bearer signed.synthetic.token'}});
test('service bridge accepts only signed correct-audience verified Webmaster identity',async()=>{
const claims={aud:audience,iss:'https://accounts.google.com',email:serviceAccount,email_verified:true};await verifyStorageService(request,{audience,serviceAccount,verifyToken:async()=>claims});
for(const change of [{aud:'https://other.example'},{email:'other@gravy-meta.iam.gserviceaccount.com'},{email_verified:false},{iss:'https://evil.example'}])await assert.rejects(verifyStorageService(request,{audience,serviceAccount,verifyToken:async()=>({...claims,...change})}),e=>e.status===403);
await assert.rejects(verifyStorageService(request,{audience,serviceAccount,verifyToken:async()=>{throw Error('invalid signature');}}));
await assert.rejects(verifyStorageService(new Request(audience),{audience,serviceAccount,verifyToken:async()=>claims}),e=>e.status===403);
});
