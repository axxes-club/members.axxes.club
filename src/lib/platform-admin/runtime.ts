import { createCommands } from "./commands";
import { revealInvitationLink } from "./invitations";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import type { Sql } from "./directory";
import { createAdminHandler, type AdminDependencies } from "./http";
import { createIntegrationAuthenticator } from "./integration-auth";
const shared = globalThis as unknown as { platformAdminPool?: Pool };
export function administrationDatabase() {
  const pool = (shared.platformAdminPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    connectionTimeoutMillis: 5000,
    statement_timeout: 5000,
    idleTimeoutMillis: 30000,
  }));
  return {
    query: async (sql: string, values?: unknown[]) => pool.query(sql, values),
    async transaction<T>(work: (tx: Sql) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await work({
          query: (sql, values) => client.query(sql, values),
        });
        await client.query("COMMIT");
        return result;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
  };
}
export function runtimeAdmin(overrides: Partial<AdminDependencies> = {}) {
  const db = administrationDatabase();
  const config = {
    principal: process.env.PLATFORM_ADMIN_PRINCIPAL ?? "",
    subject: process.env.PLATFORM_ADMIN_PRINCIPAL_SUBJECT ?? "",
    audience: "https://members-njehxvkw2q-uw.a.run.app",
  };
  const services = (process.env.PLATFORM_VERIFIED_SERVICES ?? "")
    .split(",")
    .filter((s) =>
      [
        "members",
        "handshake",
        "lanes",
        "developer",
        "axxes-workspace-api",
      ].includes(s),
    );
  const commands = createCommands(db, {
    services,
    mail: {
      key: process.env.WEBMASTER_RESEND_API_KEY,
      from: process.env.WEBMASTER_RESEND_FROM,
    },
  });
  return createAdminHandler({
    db,
    execute: commands.execute,
    getOperation: commands.getOperation,
    reconcile: commands.reconcile,
    mailConfigured:
      !!process.env.WEBMASTER_RESEND_API_KEY &&
      !!process.env.WEBMASTER_RESEND_FROM,
    revealInvitation: async (id, actor) => {
      const link = await revealInvitationLink(db, id);
      await db.query(
        `INSERT INTO platform_admin_audit(id,operation_id,wm_actor,integration_id,correlation_id,subject_kind,subject_id,action,result) VALUES($1,$2,$3,$4,$5,'invitation',$6,'invitation.link','revealed')`,
        [
          randomUUID(),
          randomUUID(),
          actor.wmUserId,
          actor.integrationId,
          actor.correlationId,
          id,
        ],
      );
      return link;
    },
    authenticate: createIntegrationAuthenticator(config),
    policyReady:
      process.env.PLATFORM_ADMIN_READY === "true" &&
      process.env.PLATFORM_ACCESS_POLICY_ENABLED === "true",
    services,
    ...overrides,
  });
}
