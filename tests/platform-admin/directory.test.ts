import { test } from "node:test";
import assert from "node:assert/strict";
import { createDirectory } from "../../src/lib/platform-admin/directory";
import { fixture } from "./fixtures";
test("stable pages with tied dates and insertion between reads", async () => {
  const db = await fixture();
  try {
    const dir = createDirectory(db);
    const first = await dir.listUsers({ limit: 1 });
    assert.equal(first.items[0].subject.id, "a");
    await db.exec(
      `INSERT INTO "user"(id,name,email,email_verified,created_at) VALUES('0','Zero','zero@example.com',true,'2025-01-01')`,
    );
    const next = await dir.listUsers({ limit: 1, cursor: first.nextCursor! });
    assert.equal(next.items[0].subject.id, "b");
    assert.ok(next.nextCursor);
  } finally {
    await db.close();
  }
});
test("safe searchable metadata and live membership only", async () => {
  const db = await fixture();
  try {
    const dir = createDirectory(db);
    assert.equal(
      (await dir.listUsers({ limit: 25, query: "Ada" })).items.length,
      1,
    );
    const detail = await dir.getUser({ authorityId: "axxes-shared", id: "a" });
    assert.equal(detail.memberships.length, 1);
    assert.equal(detail.access.length, 0);
    assert.ok(!("token" in detail));
    await db.exec(`UPDATE tenant_memberships SET deleted_at=now()`);
    assert.equal(
      (
        await dir.getOrganization({
          authorityId: "axxes-shared",
          id: "11111111-1111-4111-8111-111111111111",
        })
      ).memberCount,
      0,
    );
    await assert.rejects(() => dir.getUser({ authorityId: "other", id: "a" }));
  } finally {
    await db.close();
  }
});
test("membership pagination is stable and scoped to the selected organization", async () => {
  const db = await fixture();
  try {
    await db.exec(
      `INSERT INTO tenant_memberships(id,tenant_id,user_id,role) VALUES('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','b','member')`,
    );
    const directory = createDirectory(db);
    const first = await directory.listMemberships(
      {
        authorityId: "axxes-shared",
        id: "11111111-1111-4111-8111-111111111111",
      },
      "organization",
      { limit: 1 },
    );
    assert.equal(first.items.length, 1);
    assert.ok(first.nextCursor);
    const second = await directory.listMemberships(
      {
        authorityId: "axxes-shared",
        id: "11111111-1111-4111-8111-111111111111",
      },
      "organization",
      { limit: 1, cursor: first.nextCursor! },
    );
    assert.notEqual(first.items[0].id, second.items[0].id);
  } finally {
    await db.close();
  }
});
test('organization details include the editable contact email',async()=>{const db=await fixture();try{await db.exec(`UPDATE tenants SET email='studio@example.com'`);const detail=await createDirectory(db).getOrganization({authorityId:'axxes-shared',id:'11111111-1111-4111-8111-111111111111'});assert.equal(detail.contactEmail,'studio@example.com');}finally{await db.close();}});
