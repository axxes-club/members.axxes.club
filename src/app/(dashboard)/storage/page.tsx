import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StoragePanel } from "@/components/storage/storage-panel";
export const dynamic = "force-dynamic";
export default async function StoragePage() {
 const tenantId = (await cookies()).get("tenant_id")?.value;
 if (!tenantId) redirect("/settings");
 return <StoragePanel tenantId={tenantId} />;
}
