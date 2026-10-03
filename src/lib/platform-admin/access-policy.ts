import type { Sql } from "./directory";
import { assertAuthority, createDirectory } from "./directory";
import { PlatformError, type SubjectRef, type AdminActor } from "./contracts";
export type AccessDecision = {
  allowed: boolean;
  reason:
    | "allowed"
    | "account_suspended"
    | "organization_suspended"
    | "membership_missing"
    | "service_denied";
  version: string;
};
export async function evaluateAccess(
  db: Sql,
  userId: string,
  organizationId?: string,
  serviceId?: string,
): Promise<AccessDecision> {
  const u = (
    await db.query(
      `SELECT u.id,coalesce(p.state,'active') AS state,coalesce(p.revision,0)::text AS version FROM "user" u LEFT JOIN platform_subject_policy p ON p.subject_kind='user' AND p.subject_id=u.id WHERE u.id=$1`,
      [userId],
    )
  ).rows[0];
  if (!u || u.state === "suspended")
    return {
      allowed: false,
      reason: "account_suspended",
      version: String(u?.version ?? "0"),
    };
  const version = String(u.version);
  if (organizationId) {
    const t = (
      await db.query(`SELECT status,deleted_at FROM tenants WHERE id=$1`, [
        organizationId,
      ])
    ).rows[0];
    if (
      !t ||
      t.deleted_at ||
      ["suspended", "cancelled"].includes(String(t.status))
    )
      return { allowed: false, reason: "organization_suspended", version };
    const m = (
      await db.query(
        `SELECT id FROM tenant_memberships WHERE user_id=$1 AND tenant_id=$2 AND deleted_at IS NULL`,
        [userId, organizationId],
      )
    ).rows[0];
    if (!m) return { allowed: false, reason: "membership_missing", version };
    if (serviceId) {
      const organizationPolicy = (
        await db.query(
          `SELECT allowed FROM platform_organization_entitlements WHERE tenant_id=$1 AND service_id=$2`,
          [organizationId, serviceId],
        )
      ).rows[0];
      if (organizationPolicy?.allowed === false)
        return { allowed: false, reason: "service_denied", version };
      const e = (
        await db.query(
          `SELECT allowed FROM platform_entitlements WHERE user_id=$1 AND tenant_id=$2 AND service_id=$3`,
          [userId, organizationId, serviceId],
        )
      ).rows[0];
      if (e?.allowed === false)
        return { allowed: false, reason: "service_denied", version };
    }
  }
  return { allowed: true, reason: "allowed", version };
}
export async function lockSubject(
  db: Sql,
  s: SubjectRef,
  kind: "user" | "organization",
  expectedVersion: string,
) {
  assertAuthority(s);
  const rows = (
    await db.query(
      kind === "user"
        ? `SELECT id FROM "user" WHERE id=$1 FOR UPDATE`
        : `SELECT id FROM tenants WHERE id=$1 AND deleted_at IS NULL FOR UPDATE`,
      [s.id],
    )
  ).rows;
  if (!rows.length)
    throw new PlatformError(
      404,
      "SUBJECT_NOT_FOUND",
      "The subject no longer exists.",
    );
  const detail =
    kind === "user"
      ? await createDirectory(db, true).getUser(s)
      : await createDirectory(db, true).getOrganization(s);
  if (detail.version !== expectedVersion)
    throw new PlatformError(
      409,
      "STALE_SUBJECT",
      "This record changed. Refresh and review the change again.",
    );
  return detail;
}
export async function bumpVersion(
  db: Sql,
  s: SubjectRef,
  kind: "user" | "organization",
) {
  await db.query(
    `INSERT INTO platform_subject_policy(subject_kind,subject_id,revision) VALUES($1,$2,1) ON CONFLICT(subject_kind,subject_id) DO UPDATE SET revision=platform_subject_policy.revision+1,updated_at=now()`,
    [kind, s.id],
  );
}
// Call only inside the authority command transaction; row locks protect both version check and mutation.
export async function setAccountState(
  db: Sql,
  s: SubjectRef,
  state: "active" | "suspended",
  expectedVersion: string,
  reason: string,
  _actor: AdminActor,
): Promise<string> {
  const detail = await lockSubject(db, s, "user", expectedVersion);
  if ("protected" in detail && detail.protected)
    throw new PlatformError(
      403,
      "PROTECTED_ACCOUNT",
      "Platform administrators require a separately reviewed access change.",
    );
  await db.query(
    `INSERT INTO platform_subject_policy(subject_kind,subject_id,state,reason,revision) VALUES('user',$1,$2,$3,1) ON CONFLICT(subject_kind,subject_id) DO UPDATE SET state=$2,reason=$3,revision=platform_subject_policy.revision+1,updated_at=now()`,
    [s.id, state, reason],
  );
  return (await createDirectory(db, true).getUser(s)).version;
}
export async function setOrganizationState(
  db: Sql,
  s: SubjectRef,
  state: "active" | "suspended",
  expectedVersion: string,
  reason: string,
  _actor: AdminActor,
): Promise<string> {
  const detail = await lockSubject(db, s, "organization", expectedVersion);
  if (state === "active") {
    const p = (
      await db.query(
        `SELECT prior_state FROM platform_subject_policy WHERE subject_kind='organization' AND subject_id=$1`,
        [s.id],
      )
    ).rows[0];
    if (
      detail.state !== "suspended" ||
      !p?.prior_state ||
      !["active", "pending"].includes(String(p.prior_state))
    )
      throw new PlatformError(
        409,
        "INELIGIBLE_ORGANIZATION",
        "This organization cannot be reactivated through this operation.",
      );
    await db.query(
      `UPDATE tenants SET status=$2,updated_at=now() WHERE id=$1`,
      [s.id, p.prior_state],
    );
  } else {
    if (["cancelled", "suspended"].includes(detail.state))
      throw new PlatformError(
        409,
        "INELIGIBLE_ORGANIZATION",
        "Only an eligible organization can be suspended.",
      );
    await db.query(
      `UPDATE tenants SET status='suspended',updated_at=now() WHERE id=$1`,
      [s.id],
    );
  }
  await db.query(
    `INSERT INTO platform_subject_policy(subject_kind,subject_id,state,prior_state,reason,revision) VALUES('organization',$1,$2,$3,$4,1) ON CONFLICT(subject_kind,subject_id) DO UPDATE SET state=$2,prior_state=CASE WHEN $2='suspended' THEN $3 ELSE platform_subject_policy.prior_state END,reason=$4,revision=platform_subject_policy.revision+1,updated_at=now()`,
    [s.id, state, detail.state, reason],
  );
  return (await createDirectory(db, true).getOrganization(s)).version;
}
