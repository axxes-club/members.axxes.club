import { inArray, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { requireTenantAccess } from "@/lib/auth/tenant-context";
import { verifyShareToken } from "@/lib/dam/share";
import { matchesShare } from "./permissions-core.mjs";
export async function authorizeAssetRead(
  request: Request,
  { urls, record }: {key?:string;urls:string[];record:import("./contracts.mjs").Receipt|null},
) {
  const candidates = await db
    .select()
    .from(assets)
    .where(or(inArray(assets.url, urls), inArray(assets.thumbnailUrl, urls)));
  const rows = candidates.filter(
    (row) =>
      !record?.metadata.tenantId || row.tenantId === record.metadata.tenantId,
  );
  const token = new URL(request.url).searchParams.get("share");
  const payload = token ? verifyShareToken(token) : null;
  if (rows.some((row) => matchesShare(payload, row))) return true;
  const context = await requireTenantAccess().catch(() => null);
  return !!context && rows.some((row) => row.tenantId === context.tenantId);
}
