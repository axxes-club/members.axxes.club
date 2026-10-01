import {auth} from "@/lib/auth";
import {storagePool} from "./database";
import {storageRoutes} from "./http.mjs";
import {OAuth2Client} from "google-auth-library";
import {verifyStorageService} from "./service-identity.mjs";
const oauth=new OAuth2Client();
const audience=process.env.STORAGE_ADMIN_AUDIENCE || "https://members.axxes.club";
async function verifyService(request:Request){await verifyStorageService(request,{audience,serviceAccount:"webmaster-runtime@gravy-meta.iam.gserviceaccount.com",verifyToken:async token=>(await oauth.verifyIdToken({idToken:token,audience})).getPayload()});}
export function storageService(){return storageRoutes({pool:storagePool(),getActor:async(request:Request)=>{const session=await auth.api.getSession({headers:request.headers});return session?.user?{kind:"member" as const,id:session.user.id}:null;},origins:["https://members.axxes.club"],verifyService});}
