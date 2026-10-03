import { test } from "node:test";
import assert from "node:assert/strict";
import { policyFixture } from "./fixtures";
import {
  evaluateAccess,
  setAccountState,
  setOrganizationState,
} from "../../src/lib/platform-admin/access-policy";
import { createDirectory } from "../../src/lib/platform-admin/directory";
const org = "11111111-1111-4111-8111-111111111111";
const actor = { wmUserId: "owner", integrationId: "wm", correlationId: "test" };
test("policy compatibility, membership and denied entitlement", async () => {
  const db = await policyFixture();
  try {
    assert.equal((await evaluateAccess(db, "a", org, "lanes")).allowed, true);
    assert.equal(
      (await evaluateAccess(db, "b", org, "lanes")).reason,
      "membership_missing",
    );
    await db.query(
      `INSERT INTO platform_entitlements(user_id,tenant_id,service_id,allowed) VALUES($1,$2,$3,false)`,
      ["a", org, "lanes"],
    );
    assert.equal(
      (await evaluateAccess(db, "a", org, "lanes")).reason,
      "service_denied",
    );
    await db.exec(`UPDATE tenant_memberships SET deleted_at=now()`);
    assert.equal(
      (await evaluateAccess(db, "a", org, "lanes")).reason,
      "membership_missing",
    );
  } finally {
    await db.close();
  }
});
test("suspension invalidates requests and stale edits, and reactivation preserves revoked credentials", async () => {
  const db = await policyFixture();
  try {
    const dir = createDirectory(db, true);
    const user = await dir.getUser({ authorityId: "axxes-shared", id: "b" });
    await setAccountState(
      db,
      user.subject,
      "suspended",
      user.version,
      "Support request",
      actor,
    );
    assert.equal((await evaluateAccess(db, "b")).reason, "account_suspended");
    await assert.rejects(
      () =>
        setAccountState(db, user.subject, "active", user.version, "", actor),
      /changed/,
    );
    const refreshed = await dir.getUser(user.subject);
    await setAccountState(
      db,
      user.subject,
      "active",
      refreshed.version,
      "",
      actor,
    );
    assert.equal((await evaluateAccess(db, "b")).allowed, true);
  } finally {
    await db.close();
  }
});
test("organization suspension and cancelled/deleted organization eligibility", async () => {
  const db = await policyFixture();
  try {
    const dir = createDirectory(db, true);
    const o = await dir.getOrganization({
      authorityId: "axxes-shared",
      id: org,
    });
    await setOrganizationState(
      db,
      o.subject,
      "suspended",
      o.version,
      "Support request",
      actor,
    );
    assert.equal(
      (await evaluateAccess(db, "a", org)).reason,
      "organization_suspended",
    );
    await db.exec(`UPDATE tenants SET status='cancelled'`);
    const current = await dir.getOrganization(o.subject);
    await assert.rejects(() =>
      setOrganizationState(db, o.subject, "active", current.version, "", actor),
    );
    await db.exec(`UPDATE tenants SET deleted_at=now()`);
    assert.equal((await evaluateAccess(db, "a", org)).allowed, false);
  } finally {
    await db.close();
  }
});
test("superadmin does not bypass policy and protected admins cannot be suspended", async () => {
  const db = await policyFixture();
  try {
    await db.exec(`UPDATE "user" SET is_superadmin=true WHERE id='a'`);
    await db.exec(
      `INSERT INTO platform_subject_policy(subject_kind,subject_id,state) VALUES('user','a','suspended')`,
    );
    assert.equal((await evaluateAccess(db, "a")).allowed, false);
    const a = await createDirectory(db, true).getUser({
      authorityId: "axxes-shared",
      id: "a",
    });
    await assert.rejects(() =>
      setAccountState(db, a.subject, "suspended", a.version, "test", actor),
    );
  } finally {
    await db.close();
  }
});

test("directory access reports effective organization and account state rather than just stored grants", async () => {
  const db = await policyFixture();
  try {
    const dir = createDirectory(db, true, ["lanes", "axxes-workspace-api"]);
    const a = { authorityId: "axxes-shared", id: "a" },
      organization = { authorityId: "axxes-shared", id: org };
    assert.equal(
      (await dir.getUser(a)).access.find((v) => v.serviceId === "lanes")?.state,
      "allowed",
    );
    await db.query(
      `INSERT INTO platform_organization_entitlements(tenant_id,service_id,allowed) VALUES($1,'lanes',false)`,
      [org],
    );
    assert.equal(
      (await dir.getUser(a)).access.find((v) => v.serviceId === "lanes")?.state,
      "denied",
    );
    assert.equal(
      (await dir.getOrganization(organization)).access.find(
        (v) => v.serviceId === "lanes",
      )?.state,
      "denied",
    );
    assert.equal((await dir.getUser(a)).access.find(v=>v.serviceId==='lanes')?.policyState,'allowed');
    assert.equal((await dir.getUser(a)).access.find(v=>v.serviceId==='lanes')?.blockedReason,'Organization app access disabled');
    await db.exec(
      `INSERT INTO platform_subject_policy(subject_kind,subject_id,state) VALUES('user','a','suspended')`,
    );
    assert.ok((await dir.getUser(a)).access.every((v) => v.state === "denied"));
  } finally {
    await db.close();
  }
});
test("service filters use effective membership and organization policy, and reject unknown integrations", async () => {
  const db = await policyFixture();
  try {
    const directory = createDirectory(db, true, ["lanes"]);
    assert.equal(
      (await directory.listUsers({ limit: 25, serviceId: "lanes" })).items
        .length,
      1,
    );
    await db.exec(
      `INSERT INTO platform_organization_entitlements(tenant_id,service_id,allowed) VALUES('11111111-1111-4111-8111-111111111111','lanes',false)`,
    );
    assert.equal(
      (await directory.listUsers({ limit: 25, serviceId: "lanes" })).items
        .length,
      0,
    );
    assert.equal(
      (await directory.listOrganizations({ limit: 25, serviceId: "lanes" }))
        .items.length,
      0,
    );
    await assert.rejects(() =>
      directory.listUsers({ limit: 25, serviceId: "unknown" }),
    );
  } finally {
    await db.close();
  }
});
test('session validity remains authoritative after revocation and rejects another user or expired session',async()=>{const db=await policyFixture();try{await db.exec(`CREATE TABLE "session"(id text PRIMARY KEY,user_id text,expires_at timestamptz);INSERT INTO "session" VALUES('cached','a',now()+interval '1 day'),('other','b',now()+interval '1 day'),('expired','a',now()-interval '1 day')`);const {createPlatformAccess}=await import('../../src/lib/platform-access-core');const access=createPlatformAccess(db,'members');assert.equal(await access.sessionAllowed('a','cached'),true);assert.equal(await access.sessionAllowed('a','other'),false);assert.equal(await access.sessionAllowed('a','expired'),false);await db.exec(`DELETE FROM "session" WHERE id='cached'`);assert.equal(await access.sessionAllowed('a','cached'),false);assert.equal(await access.sessionAllowed('b','other'),true);}finally{await db.close();}});
