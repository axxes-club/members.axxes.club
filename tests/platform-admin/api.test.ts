import { test } from "node:test";
import assert from "node:assert/strict";
import { createIntegrationAuthenticator } from "../../src/lib/platform-admin/integration-auth";
test("Google token claims and configured principal/audience must match", async () => {
  const principal = "wm@project.iam.gserviceaccount.com",
    audience = "https://members.run.app";
  let claims: any = {
    iss: "https://accounts.google.com",
    aud: audience,
    email: principal,
    email_verified: true,
    sub: "123",
    exp: Date.now() / 1000 + 3600,
  };
  const auth = createIntegrationAuthenticator({
    principal,
    subject: "123",
    audience,
    verify: async () => claims,
  });
  const request = () =>
    new Request(audience, { headers: { authorization: "Bearer token" } });
  assert.equal((await auth(request())).integrationId, principal);
  for (const edit of [
    { aud: "other" },
    { email: "other" },
    { sub: "other" },
    { email_verified: false },
    { exp: 0 },
    { iss: "fake" },
  ]) {
    const saved = claims;
    claims = { ...claims, ...edit };
    await assert.rejects(() => auth(request()));
    claims = saved;
  }
  await assert.rejects(() => auth(new Request(audience)));
});

import { createAdminHandler } from "../../src/lib/platform-admin/http";
import { fixture,policyFixture } from "./fixtures";
test("directory routes require integration auth and do not expose command/link endpoints without capabilities", async () => {
  const db = await fixture();
  try {
    const handler = createAdminHandler({
      db,
      authenticate: async (r) => {
        if (!r.headers.has("authorization")) throw new Error("unauthorized");
        return { integrationId: "wm" };
      },
      policyReady: false,
      services: [],
    });
    const url = "https://members.run.app/api/platform-admin/v1/";
    assert.notEqual((await handler(new Request(url + "users"))).status, 200);
    const response = await handler(
      new Request(url + "users?limit=1", { headers: { authorization: "x" } }),
    );
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.items.length, 1);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const cap = await (
      await handler(
        new Request(url + "capabilities", { headers: { authorization: "x" } }),
      )
    ).json();
    assert.ok(cap.actions.every((c: any) => !c.available));
    assert.equal(
      (
        await handler(
          new Request(url + "commands", {
            method: "POST",
            headers: { authorization: "x", "content-type": "application/json" },
            body: "{}",
          }),
        )
      ).status,
      503,
    );
  } finally {
    await db.close();
  }
});
test('capabilities fail closed without policy tables, and read-only mode preserves suspended account visibility',async()=>{const db=await policyFixture();try{const handler=createAdminHandler({db,authenticate:async()=>({integrationId:'wm'}),policyReady:true,policyAvailable:async()=>false,services:['lanes'],execute:async()=>{throw Error('Must not execute');}});const cap=await handler(new Request('https://members.example/api/platform-admin/v1/capabilities'));assert.equal((await cap.json()).actions.every((a:{available:boolean})=>!a.available),true);await db.exec(`INSERT INTO platform_subject_policy(subject_kind,subject_id,state) VALUES('user','a','suspended')`);const read=createAdminHandler({db,authenticate:async()=>({integrationId:'wm'}),policyReady:false,policyAvailable:async()=>true,services:['lanes']});const user=await read(new Request('https://members.example/api/platform-admin/v1/users/a'));assert.equal((await user.json()).state,'suspended');}finally{await db.close();}});
