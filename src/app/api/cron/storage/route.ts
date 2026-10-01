import {cleanupUnreferencedStorage} from "@/lib/gcs/server";
import { storagePool } from "@/lib/storage/database";
import { expireReservations } from "@/lib/storage/quota.mjs";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 if(!process.env.CRON_SECRET || request.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)return Response.json({error:"Unauthorized"},{status:401});
 const client=await storagePool().connect();
 try{await client.query("BEGIN");const expired=await expireReservations(client);await client.query("COMMIT");const removed=await cleanupUnreferencedStorage();return Response.json({expired,removed},{headers:{"Cache-Control":"no-store"}});}
 catch{await client.query("ROLLBACK");return Response.json({error:"Storage maintenance failed"},{status:500});}finally{client.release();}
}
