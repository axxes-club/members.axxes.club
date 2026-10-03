import {
  PlatformError,
  type SubjectRef,
  type DirectoryQuery,
  type Page,
  type UserSummary,
  type OrganizationSummary,
  type UserDetails,
  type OrganizationDetails,
  type Membership,
  type InvitationSummary,
} from "./contracts";
import {
  parseDirectoryQuery,
  parseUser,
  parseOrganization,
  parseMembership,
  parseInvitation,
} from "./validation";
export interface Sql {
  query(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: Record<string, unknown>[] }>;
}
export const AUTHORITY = "axxes-shared";
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v));
const ref = (id: unknown) => ({ authorityId: AUTHORITY, id: String(id) });
export function assertOrganizationId(id: string) {
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)
  )
    throw new PlatformError(
      400,
      "INVALID_ORGANIZATION",
      "Invalid organization identifier.",
    );
}
export function assertAuthority(s: SubjectRef) {
  if (s.authorityId !== AUTHORITY)
    throw new PlatformError(
      404,
      "SUBJECT_NOT_FOUND",
      "This identity authority is not connected.",
    );
}
export function createDirectory(
  db: Sql,
  policyReady = false,
  services: string[] = [],
) {
  const userVersion = `md5(u.updated_at::text || coalesce((SELECT string_agg(m.id::text || m.role || m.updated_at::text || coalesce(m.deleted_at::text,''),',' ORDER BY m.id) FROM tenant_memberships m WHERE m.user_id=u.id),'') ${policyReady ? "|| coalesce(p.revision::text,'0')" : ""})`;
  const orgVersion = `md5(t.updated_at::text || t.status || coalesce((SELECT string_agg(m.id::text || m.role || m.updated_at::text || coalesce(m.deleted_at::text,''),',' ORDER BY m.id) FROM tenant_memberships m WHERE m.tenant_id=t.id),'') ${policyReady ? "|| coalesce(p.revision::text,'0')" : ""})`;
  const userSelect = `SELECT u.id,u.name,u.email,u.email_verified,u.is_superadmin,u.created_at,${userVersion} AS version,${policyReady ? "coalesce(p.state,'active')" : "'active'"} AS state,(SELECT count(*)::int FROM tenant_memberships m JOIN tenants t ON t.id=m.tenant_id WHERE m.user_id=u.id AND m.deleted_at IS NULL AND t.deleted_at IS NULL) AS count FROM "user" u ${policyReady ? "LEFT JOIN platform_subject_policy p ON p.subject_kind='user' AND p.subject_id=u.id" : ""}`;
  const orgSelect = `SELECT t.id,t.name,t.slug,t.status,t.created_at,t.email AS contact_email,${orgVersion} AS version,o.id AS owner_id,o.name AS owner_name,o.email AS owner_email,(SELECT count(*)::int FROM tenant_memberships m WHERE m.tenant_id=t.id AND m.deleted_at IS NULL) AS count FROM tenants t LEFT JOIN "user" o ON o.id=t.owner_id ${policyReady ? "LEFT JOIN platform_subject_policy p ON p.subject_kind='organization' AND p.subject_id=t.id::text" : ""}`;
  const user = (r: Record<string, unknown>) =>
    parseUser({
      subject: ref(r.id),
      name: r.name || r.email,
      email: r.email,
      emailVerified: r.email_verified,
      state: r.state,
      version: r.version,
      createdAt: iso(r.created_at),
      organizationCount: r.count,
      protected: r.is_superadmin,
    });
  const organization = (r: Record<string, unknown>) =>
    parseOrganization({
      subject: ref(r.id),
      name: r.name,
      slug: r.slug,
      state: r.status,
      version: r.version,
      createdAt: iso(r.created_at),
      memberCount: r.count,
      owner: r.owner_id
        ? {
            id: r.owner_id,
            name: r.owner_name || r.owner_email,
            email: r.owner_email,
          }
        : null,
    });
  async function list<T>(
    query: DirectoryQuery,
    kind: "user" | "organization",
    parse: (r: Record<string, unknown>) => T,
  ): Promise<Page<T>> {
    const q = parseDirectoryQuery(query),
      values: unknown[] = [],
      conditions: string[] = [];
    const alias = kind === "user" ? "u" : "t";
    const param = (v: unknown) => {
      values.push(v);
      return "$" + values.length;
    };
    if (kind === "organization") conditions.push("t.deleted_at IS NULL");
    if (q.query) {
      const n = param("%" + q.query.replace(/[\%_]/g, "\\$&") + "%");
      conditions.push(
        `(${alias}.name ILIKE ${n} OR ${kind === "user" ? "u.email" : "t.slug"} ILIKE ${n} OR ${alias}.id::text ILIKE ${n})`,
      );
    }
    if (q.cursor) {
      const c = JSON.parse(Buffer.from(q.cursor, "base64url").toString());
      conditions.push(
        `(${alias}.created_at,${alias}.id::text)>(${param(c.createdAt)}::timestamptz,${param(c.id)})`,
      );
    }
    if (q.state)
      conditions.push(
        `${kind === "user" ? (policyReady ? "coalesce(p.state,'active')" : "'active'") : "t.status"}=${param(q.state)}`,
      );
    if (q.organization) {
      assertAuthority(q.organization);
      assertOrganizationId(q.organization.id);
      conditions.push(
        `EXISTS(SELECT 1 FROM tenant_memberships f WHERE f.user_id=u.id AND f.tenant_id=${param(q.organization.id)}::uuid AND f.deleted_at IS NULL)`,
      );
    }
    if (q.serviceId) {
      if (
        !policyReady ||
        !services.includes(q.serviceId) ||
        !["lanes", "developer", "axxes-workspace-api"].includes(q.serviceId)
      )
        throw new PlatformError(
          400,
          "UNSUPPORTED_FILTER",
          "This service does not have verified access filtering.",
        );
      const service = param(q.serviceId),
        eligible =
          q.serviceId === "axxes-workspace-api"
            ? "status='active'"
            : "status NOT IN ('suspended','cancelled')";
      if (kind === "user") {
        conditions.push(`coalesce(p.state,'active')='active'`);
        conditions.push(
          `EXISTS(SELECT 1 FROM tenant_memberships sm JOIN tenants st ON st.id=sm.tenant_id WHERE sm.user_id=u.id AND sm.deleted_at IS NULL AND st.deleted_at IS NULL AND st.${eligible} ${q.organization ? `AND st.id=${param(q.organization.id)}::uuid` : ""} AND NOT EXISTS(SELECT 1 FROM platform_entitlements se WHERE se.user_id=u.id AND se.tenant_id=st.id AND se.service_id=${service} AND se.allowed=false) AND NOT EXISTS(SELECT 1 FROM platform_organization_entitlements so WHERE so.tenant_id=st.id AND so.service_id=${service} AND so.allowed=false))`,
        );
      } else
        conditions.push(
          `t.${eligible} AND NOT EXISTS(SELECT 1 FROM platform_organization_entitlements so WHERE so.tenant_id=t.id AND so.service_id=${service} AND so.allowed=false)`,
        );
    }
    const rows = (
      await db.query(
        (kind === "user" ? userSelect : orgSelect) +
          (conditions.length ? " WHERE " + conditions.join(" AND ") : "") +
          ` ORDER BY ${alias}.created_at,${alias}.id::text LIMIT ${param(q.limit + 1)}`,
        values,
      )
    ).rows;
    const shown = rows.slice(0, q.limit),
      last = shown.at(-1);
    return {
      items: shown.map(parse),
      nextCursor:
        rows.length > q.limit && last
          ? Buffer.from(
              JSON.stringify({ createdAt: iso(last.created_at), id: last.id }),
            ).toString("base64url")
          : null,
      observedAt: new Date().toISOString(),
    };
  }
  async function memberships(kind: "user" | "organization", id: string) {
    const rows = (
      await db.query(
        `SELECT m.id,m.tenant_id,m.user_id,m.role,m.joined_at,t.name AS organization_name,u.name,u.email FROM tenant_memberships m JOIN tenants t ON t.id=m.tenant_id JOIN "user" u ON u.id=m.user_id WHERE m.${kind === "user" ? "user_id" : "tenant_id"}=$1 AND m.deleted_at IS NULL AND t.deleted_at IS NULL ORDER BY t.name,u.name,m.id LIMIT 100`,
        [id],
      )
    ).rows;
    return rows.map((r) =>
      parseMembership({
        id: r.id,
        organization: ref(r.tenant_id),
        user: ref(r.user_id),
        organizationName: r.organization_name,
        name: r.name || r.email,
        email: r.email,
        role: r.role,
        joinedAt: iso(r.joined_at),
      }),
    );
  }
  async function invitations(kind: "user" | "organization", id: string) {
    const rows = (
      await db.query(
        `SELECT i.id,i.tenant_id,i.email,i.role,i.status,i.expires_at ${policyReady ? ",d.state AS delivery_state" : ""} FROM tenant_invitations i ${policyReady ? "LEFT JOIN platform_invitation_delivery d ON d.invitation_id=i.id" : ""} WHERE ${kind === "user" ? 'lower(i.email)=(SELECT lower(email) FROM "user" WHERE id=$1)' : "i.tenant_id=$1"} ORDER BY i.created_at DESC,i.id LIMIT 100`,
        [id],
      )
    ).rows;
    return rows.map((r) =>
      parseInvitation({
        id: r.id,
        organization: ref(r.tenant_id),
        email: r.email,
        role: r.role,
        state: r.status,
        expiresAt: iso(r.expires_at),
        ...(r.delivery_state ? { deliveryState: r.delivery_state } : {}),
      }),
    );
  }
  async function access(kind: "user" | "organization", id: string) {
    const supported = services.filter((v) =>
      ["lanes", "developer", "axxes-workspace-api"].includes(v),
    );
    if (!policyReady || !supported.length) return [];
    const eligibility = `CASE WHEN services.id='axxes-workspace-api' THEN t.status='active' ELSE t.status NOT IN ('suspended','cancelled') END`;
    const userQuery = `SELECT services.id AS service_id,t.id AS tenant_id,coalesce(individual.allowed,true) AS policy_allowed,CASE WHEN coalesce(user_policy.state,'active')<>'active' THEN 'Account suspended' WHEN NOT(${eligibility}) THEN 'Organization not eligible' WHEN organization_policy.allowed=false THEN 'Organization app access disabled' WHEN individual.allowed=false THEN 'Member app access revoked' ELSE NULL END AS blocked_reason,(coalesce(user_policy.state,'active')='active' AND coalesce(individual.allowed,true) AND coalesce(organization_policy.allowed,true) AND ${eligibility}) AS allowed FROM tenant_memberships membership JOIN tenants t ON t.id=membership.tenant_id CROSS JOIN unnest($2::text[]) services(id) LEFT JOIN platform_subject_policy user_policy ON user_policy.subject_kind='user' AND user_policy.subject_id=membership.user_id LEFT JOIN platform_entitlements individual ON individual.tenant_id=t.id AND individual.user_id=membership.user_id AND individual.service_id=services.id LEFT JOIN platform_organization_entitlements organization_policy ON organization_policy.tenant_id=t.id AND organization_policy.service_id=services.id WHERE membership.user_id=$1 AND membership.deleted_at IS NULL AND t.deleted_at IS NULL ORDER BY t.name,services.id LIMIT 1000`;
    const organizationQuery = `SELECT services.id AS service_id,t.id AS tenant_id,coalesce(organization_policy.allowed,true) AS policy_allowed,CASE WHEN NOT(${eligibility}) THEN 'Organization not eligible' WHEN organization_policy.allowed=false THEN 'Organization app access disabled' ELSE NULL END AS blocked_reason,(coalesce(organization_policy.allowed,true) AND ${eligibility}) AS allowed FROM tenants t CROSS JOIN unnest($2::text[]) services(id) LEFT JOIN platform_organization_entitlements organization_policy ON organization_policy.tenant_id=t.id AND organization_policy.service_id=services.id WHERE t.id=$1 AND t.deleted_at IS NULL ORDER BY services.id`;
    return (
      await db.query(kind === "user" ? userQuery : organizationQuery, [
        id,
        supported,
      ])
    ).rows.map((row) => ({
      serviceId: String(row.service_id),
      policyState:row.policy_allowed?("allowed" as const):("denied" as const),
      ...(row.blocked_reason?{blockedReason:String(row.blocked_reason)}:{}),
      organization: ref(row.tenant_id),
      state: row.allowed ? ("allowed" as const) : ("denied" as const),
      enforcement: "verified" as const,
      observedAt: new Date().toISOString(),
    }));
  }
  return {
    async listInvitations(
      s: SubjectRef,
      kind: "user" | "organization",
      query: DirectoryQuery,
    ): Promise<Page<InvitationSummary>> {
      assertAuthority(s);
      if (kind === "organization") assertOrganizationId(s.id);
      const q = parseDirectoryQuery(query),
        values: unknown[] = [s.id],
        conditions = [
          kind === "user"
            ? `lower(i.email)=(SELECT lower(email) FROM "user" WHERE id=$1)`
            : "i.tenant_id=$1",
        ];
      if (q.cursor) {
        const c = JSON.parse(Buffer.from(q.cursor, "base64url").toString());
        values.push(c.createdAt, c.id);
        conditions.push("(i.created_at,i.id::text)<($2::timestamptz,$3)");
      }
      values.push(q.limit + 1);
      const rows = (
          await db.query(
            `SELECT i.id,i.tenant_id,i.email,i.role,i.status,i.expires_at,i.created_at ${policyReady ? ",d.state AS delivery_state" : ""} FROM tenant_invitations i ${policyReady ? "LEFT JOIN platform_invitation_delivery d ON d.invitation_id=i.id" : ""} WHERE ${conditions.join(" AND ")} ORDER BY i.created_at DESC,i.id::text DESC LIMIT $${values.length}`,
            values,
          )
        ).rows,
        shown = rows.slice(0, q.limit),
        last = shown.at(-1);
      return {
        items: shown.map((r) =>
          parseInvitation({
            id: r.id,
            organization: ref(r.tenant_id),
            email: r.email,
            role: r.role,
            state: r.status,
            expiresAt: iso(r.expires_at),
            ...(r.delivery_state ? { deliveryState: r.delivery_state } : {}),
          }),
        ),
        nextCursor:
          rows.length > q.limit && last
            ? Buffer.from(
                JSON.stringify({
                  createdAt: iso(last.created_at),
                  id: last.id,
                }),
              ).toString("base64url")
            : null,
        observedAt: new Date().toISOString(),
      };
    },
    async listMemberships(
      s: SubjectRef,
      kind: "user" | "organization",
      query: DirectoryQuery,
    ): Promise<Page<Membership>> {
      assertAuthority(s);
      if (kind === "organization") assertOrganizationId(s.id);
      const q = parseDirectoryQuery(query),
        values: unknown[] = [s.id],
        conditions = [
          `m.${kind === "user" ? "user_id" : "tenant_id"}=$1`,
          `m.deleted_at IS NULL`,
          `t.deleted_at IS NULL`,
        ];
      if (q.cursor) {
        const c = JSON.parse(Buffer.from(q.cursor, "base64url").toString());
        values.push(c.createdAt, c.id);
        conditions.push(`(m.joined_at,m.id::text)>($2::timestamptz,$3)`);
      }
      values.push(q.limit + 1);
      const rows = (
          await db.query(
            `SELECT m.id,m.tenant_id,m.user_id,m.role,m.joined_at,t.name AS organization_name,u.name,u.email FROM tenant_memberships m JOIN tenants t ON t.id=m.tenant_id JOIN "user" u ON u.id=m.user_id WHERE ${conditions.join(" AND ")} ORDER BY m.joined_at,m.id::text LIMIT $${values.length}`,
            values,
          )
        ).rows,
        shown = rows.slice(0, q.limit),
        last = shown.at(-1);
      return {
        items: shown.map((r) =>
          parseMembership({
            id: r.id,
            organization: ref(r.tenant_id),
            user: ref(r.user_id),
            organizationName: r.organization_name,
            name: r.name || r.email,
            email: r.email,
            role: r.role,
            joinedAt: iso(r.joined_at),
          }),
        ),
        nextCursor:
          rows.length > q.limit && last
            ? Buffer.from(
                JSON.stringify({ createdAt: iso(last.joined_at), id: last.id }),
              ).toString("base64url")
            : null,
        observedAt: new Date().toISOString(),
      };
    },
    listUsers: (q: DirectoryQuery) => list<UserSummary>(q, "user", user),
    listOrganizations: (q: DirectoryQuery) =>
      list<OrganizationSummary>(q, "organization", organization),
    async getUser(s: SubjectRef): Promise<UserDetails> {
      assertAuthority(s);
      const r = (await db.query(userSelect + " WHERE u.id=$1", [s.id])).rows[0];
      if (!r)
        throw new PlatformError(404, "SUBJECT_NOT_FOUND", "User not found.");
      return {
        ...user(r),
        memberships: await memberships("user", s.id),
        invitations: await invitations("user", s.id),
        access: await access("user", s.id),
      };
    },
    async getOrganization(s: SubjectRef): Promise<OrganizationDetails> {
      assertAuthority(s);
      assertOrganizationId(s.id);
      const r = (
        await db.query(orgSelect + " WHERE t.id=$1 AND t.deleted_at IS NULL", [
          s.id,
        ])
      ).rows[0];
      if (!r)
        throw new PlatformError(
          404,
          "SUBJECT_NOT_FOUND",
          "Organization not found.",
        );
      return {
        ...organization(r),
        contactEmail:r.contact_email?String(r.contact_email):null,
        memberships: await memberships("organization", s.id),
        invitations: await invitations("organization", s.id),
        access: await access("organization", s.id),
      };
    },
  };
}
