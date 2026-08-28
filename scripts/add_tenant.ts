import { db } from "../src/lib/db";
import { tenants, user, tenantMemberships } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const userList = await db.select().from(user).where(eq(user.email, "viscasillas@me.com"));
  
  if (userList.length === 0) {
    console.log("User not found!");
    const anyUser = await db.select().from(user).limit(1);
    if (anyUser.length === 0) {
       console.log("No user exist in DB at all!");
       process.exit(1);
    }
    await createTenant(anyUser[0].id);
  } else {
    await createTenant(userList[0].id);
  }
}

async function createTenant(ownerId: string) {
  try {
    const res = await db.insert(tenants).values({
      name: "Colección Reyes-Veray",
      slug: "coleccion-reyes-veray",
      type: "brand",
      status: "active",
      ownerId: ownerId,
      email: "ottoreyes88@gmail.com",
    }).returning();
    
    console.log("Successfully created tenant:", res[0]);

    // Create membership
    await db.insert(tenantMemberships).values({
      tenantId: res[0].id,
      userId: ownerId,
      role: "owner",
      isPrimary: false,
    });
    console.log("Successfully created membership for owner.");
  } catch(e) {
    console.error("Failed to create:", e);
  }
  process.exit(0);
}

main();
