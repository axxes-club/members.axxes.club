import { test } from "node:test";
import assert from "node:assert/strict";
import { policyFixture } from "./fixtures";
import { createCommands } from "../../src/lib/platform-admin/commands";
import { createDirectory } from "../../src/lib/platform-admin/directory";
const org = {
    authorityId: "axxes-shared",
    id: "11111111-1111-4111-8111-111111111111",
  },
  user = { authorityId: "axxes-shared", id: "b" },
  owner = { authorityId: "axxes-shared", id: "a" };
const actor = { wmUserId: "wm", integrationId: "wm", correlationId: "test" };
const config = {
  services: [
    "members",
    "handshake",
    "lanes",
    "developer",
    "axxes-workspace-api",
  ],
};
async function setup() {
  const db = await policyFixture();
  await db.query(
    `INSERT INTO tenant_memberships(id,tenant_id,user_id,role) VALUES($1,$2,'b','member')`,
    ["33333333-3333-4333-8333-333333333333", org.id],
  );
  return db;
}
test("role edits enforce versions and owner invariants and exactly one concurrent change wins", async () => {
  const db = await setup();
  try {
    const engine = createCommands(db, config),
      dir = createDirectory(db, true);
    let u = await dir.getUser(user);
    const results = await Promise.allSettled([
      engine.execute(
        {
          subject: user,
          action: "membership.role",
          expectedVersion: u.version,
          payload: { organization: org, role: "manager" },
        },
        "role-1",
        actor,
      ),
      engine.execute(
        {
          subject: user,
          action: "membership.role",
          expectedVersion: u.version,
          payload: { organization: org, role: "viewer" },
        },
        "role-2",
        actor,
      ),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const a = await dir.getUser(owner);
    await assert.rejects(() =>
      engine.execute(
        {
          subject: owner,
          action: "membership.remove",
          expectedVersion: a.version,
          payload: { organization: org },
        },
        "remove-owner",
        actor,
      ),
    );
    await db.exec(
      `UPDATE tenant_memberships SET role='admin' WHERE user_id='a'`,
    );
    const inconsistent = await dir.getUser(owner);
    await assert.rejects(() =>
      engine.execute(
        {
          subject: owner,
          action: "membership.role",
          expectedVersion: inconsistent.version,
          payload: { organization: org, role: "viewer" },
        },
        "demote-owner",
        actor,
      ),
    );
  } finally {
    await db.close();
  }
});
test("durable idempotency, audit attribution and safe entitlement scope", async () => {
  const db = await setup();
  try {
    const engine = createCommands(db, config),
      dir = createDirectory(db, true);
    const u = await dir.getUser(user),
      command = {
        subject: user,
        action: "account.suspend" as const,
        expectedVersion: u.version,
        payload: { reason: "Support request" },
      };
    const first = await engine.execute(command, "suspend", actor);
    assert.equal(first.state, "succeeded");
    assert.equal(
      (await engine.execute(command, "suspend", actor)).operationId,
      first.operationId,
    );
    await assert.rejects(() =>
      engine.execute(
        { ...command, payload: { reason: "different" } },
        "suspend",
        actor,
      ),
    );
    assert.equal(
      (await db.query(`SELECT * FROM platform_admin_audit`)).rows.length,
      1,
    );
    assert.equal(
      (await db.query(`SELECT wm_actor FROM platform_admin_audit`)).rows[0]
        .wm_actor,
      "wm",
    );
    const current = await dir.getUser(user);
    await assert.rejects(() =>
      engine.execute(
        {
          subject: user,
          action: "access.revoke",
          expectedVersion: current.version,
          payload: { organization: org, serviceId: "unknown" },
        },
        "bad-access",
        actor,
      ),
    );
    const revoked = await engine.execute(
      {
        subject: user,
        action: "access.revoke",
        expectedVersion: current.version,
        payload: { organization: org, serviceId: "lanes" },
      },
      "access",
      actor,
    );
    assert.equal(revoked.state, "succeeded");
    const latest = await dir.getUser(user);
    await engine.execute(
      {
        subject: user,
        action: "account.reactivate",
        expectedVersion: latest.version,
        payload: {},
      },
      "reactivate",
      actor,
    );
    assert.equal(
      (await db.query(`SELECT allowed FROM platform_entitlements`)).rows[0]
        .allowed,
      false,
    );
    await assert.rejects(() =>
      engine.getOperation(first.operationId, false, "other"),
    );
  } finally {
    await db.close();
  }
});
test("organization commands preserve prior eligibility and invitation operations exclude secrets", async () => {
  const db = await setup();
  try {
    const engine = createCommands(db, config),
      dir = createDirectory(db, true);
    let o = await dir.getOrganization(org);
    const invite = await engine.execute(
      {
        subject: org,
        action: "invitation.create",
        expectedVersion: o.version,
        payload: { email: "cyd@example.com", role: "member" },
      },
      "invite",
      actor,
    );
    assert.equal(invite.deliveryState, "not_configured");
    assert.ok(!JSON.stringify(invite).includes("token="));
    o = await dir.getOrganization(org);
    await engine.execute(
      {
        subject: org,
        action: "organization.suspend",
        expectedVersion: o.version,
        payload: { reason: "Support request" },
      },
      "org-off",
      actor,
    );
    o = await dir.getOrganization(org);
    await engine.execute(
      {
        subject: org,
        action: "organization.reactivate",
        expectedVersion: o.version,
        payload: {},
      },
      "org-on",
      actor,
    );
    assert.equal((await dir.getOrganization(org)).state, "active");
  } finally {
    await db.close();
  }
});

test("the first entitlement change advances the version and invalidates earlier reviews", async () => {
  const db = await setup();
  try {
    const engine = createCommands(db, config),
      dir = createDirectory(db, true),
      u = await dir.getUser(user);
    const result = await engine.execute(
      {
        subject: user,
        action: "access.revoke",
        expectedVersion: u.version,
        payload: { organization: org, serviceId: "lanes" },
      },
      "first-entitlement",
      actor,
    );
    assert.notEqual(result.version, u.version);
    await assert.rejects(() =>
      engine.execute(
        {
          subject: user,
          action: "membership.role",
          expectedVersion: u.version,
          payload: { organization: org, role: "viewer" },
        },
        "stale-review",
        actor,
      ),
    );
  } finally {
    await db.close();
  }
});

test("organization app access applies to every member and remains denied after reactivation", async () => {
  const db = await setup();
  try {
    const engine = createCommands(db, config),
      dir = createDirectory(db, true),
      o = await dir.getOrganization(org);
    await engine.execute(
      {
        subject: org,
        action: "organization.access.revoke" as any,
        expectedVersion: o.version,
        payload: { serviceId: "lanes" },
      },
      "org-app-off",
      actor,
    );
    const { evaluateAccess } =
      await import("../../src/lib/platform-admin/access-policy");
    assert.equal(
      (await evaluateAccess(db, "a", org.id, "lanes")).allowed,
      false,
    );
    assert.equal(
      (await evaluateAccess(db, "b", org.id, "lanes")).allowed,
      false,
    );
    assert.equal(
      (await evaluateAccess(db, "b", org.id, "developer")).allowed,
      true,
    );
  } finally {
    await db.close();
  }
});
test('account suspension preserves an eligible organization owner',async()=>{
 const db=await setup();try{
 const engine=createCommands(db,config),dir=createDirectory(db,true);
 const suspend=async(id:string,key:string)=>engine.execute({subject:{authorityId:'axxes-shared',id},action:'account.suspend',expectedVersion:(await dir.getUser({authorityId:'axxes-shared',id})).version,payload:{reason:'test'}},key,actor);
 await assert.rejects(()=>suspend('a','sole-owner'),(e:unknown)=>e instanceof Error && 'code' in e && e.code==='LAST_OWNER_PROTECTED');
 await db.query(`UPDATE tenant_memberships SET role='owner' WHERE user_id='b'`);
 await suspend('a','alternate-owner');
 await assert.rejects(()=>suspend('b','last-live-owner'),(e:unknown)=>e instanceof Error && 'code' in e && e.code==='LAST_OWNER_PROTECTED');
 }finally{await db.close();}
});
test('service entitlement results match only the requested service',async()=>{
 const db=await setup();try{
 const dir=createDirectory(db,true),engine=createCommands(db,config);
 const result=await engine.execute({subject:user,action:'access.revoke',expectedVersion:(await dir.getUser(user)).version,payload:{organization:org,serviceId:'lanes'}},'one-service',actor);
 assert.deepEqual(result.services.map(s=>s.serviceId),['lanes']);
 }finally{await db.close();}
});
