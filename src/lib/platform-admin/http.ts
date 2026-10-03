import { createDirectory, AUTHORITY, type Sql } from "./directory";
import {
  PlatformError,
  type AdminActor,
  type AdminCommand,
  type OperationDetails,
} from "./contracts";
import {
  actions,
  parseDirectoryQuery,
  parseCommand,
  identifier,
  record,
  text,
} from "./validation";
export type AdminDependencies = {
  db: Sql;
  authenticate: (r: Request) => Promise<{ integrationId: string }>;
  policyReady: boolean;
  services: string[];
  mailConfigured?: boolean;
  execute?: (
    c: AdminCommand,
    key: string,
    actor: AdminActor,
  ) => Promise<OperationDetails>;
  getOperation?: (
    id: string,
    byKey: boolean,
    principal: string,
  ) => Promise<OperationDetails>;
  reconcile?: (id: string, principal: string) => Promise<OperationDetails>;
  revealInvitation?: (
    id: string,
    actor: AdminActor,
  ) => Promise<{ url: string }>;
};
export function createAdminHandler(deps: AdminDependencies) {
  return async (request: Request): Promise<Response> => {
    const headers = {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    };
    try {
      const integration = await deps.authenticate(request),
        url = new URL(request.url),
        path =
          url.pathname
            .split("/api/platform-admin/v1/")[1]
            ?.split("/")
            .filter(Boolean) ?? [],
        dir = createDirectory(deps.db, deps.policyReady, deps.services);
      const response = (v: unknown) => Response.json(v, { headers });
      if (request.method === "GET") {
        if (path[0] === "capabilities" && path.length === 1)
          return response({
            contractVersion: 1,
            authorityId: AUTHORITY,
            observedAt: new Date().toISOString(),
            services: deps.services,
            mailConfigured: deps.mailConfigured === true,
            actions: actions.map((action) => ({
              action,
              scope:
                action.startsWith("access.") ||
                action.startsWith("organization.access.")
                  ? "service"
                  : "authority",
              serviceIds:
                action.startsWith("access.") ||
                action.startsWith("organization.access.")
                  ? deps.services.filter((s) =>
                      ["lanes", "developer", "axxes-workspace-api"].includes(s),
                    )
                  : deps.services,
              enforcement: deps.services.length ? "verified" : "unverified",
              available:
                deps.policyReady &&
                !!deps.execute &&
                deps.services.length > 0 &&
                (!(
                  action.startsWith("access.") ||
                  action.startsWith("organization.access.")
                ) ||
                  deps.services.some((s) =>
                    ["lanes", "developer", "axxes-workspace-api"].includes(s),
                  )),
              reason: deps.services.length
                ? undefined
                : "Service access enforcement has not been verified.",
            })),
          });
        if (
          ["users", "organizations"].includes(path[0]) &&
          path.length === 3 &&
          path[2] === "invitations"
        )
          return response(
            await dir.listInvitations(
              { authorityId: AUTHORITY, id: identifier(path[1]) },
              path[0] === "users" ? "user" : "organization",
              parseDirectoryQuery(Object.fromEntries(url.searchParams)),
            ),
          );
        if (
          ["users", "organizations"].includes(path[0]) &&
          path.length === 3 &&
          path[2] === "memberships"
        )
          return response(
            await dir.listMemberships(
              { authorityId: AUTHORITY, id: identifier(path[1]) },
              path[0] === "users" ? "user" : "organization",
              parseDirectoryQuery(Object.fromEntries(url.searchParams)),
            ),
          );
        if (["users", "organizations"].includes(path[0]) && path.length <= 2) {
          if (path[1])
            return response(
              path[0] === "users"
                ? await dir.getUser({
                    authorityId: AUTHORITY,
                    id: identifier(path[1]),
                  })
                : await dir.getOrganization({
                    authorityId: AUTHORITY,
                    id: identifier(path[1]),
                  }),
            );
          const raw: Record<string, unknown> = Object.fromEntries(
            url.searchParams,
          );
          if (raw.organization) {
            try {
              raw.organization = JSON.parse(String(raw.organization));
            } catch {
              throw new PlatformError(
                400,
                "INVALID_QUERY",
                "Invalid organization filter.",
              );
            }
          }
          const q = parseDirectoryQuery(raw);
          if (path[0] === "organizations" && q.organization)
            throw new PlatformError(
              400,
              "INVALID_QUERY",
              "An organization filter applies only to users.",
            );
          return response(
            path[0] === "users"
              ? await dir.listUsers(q)
              : await dir.listOrganizations(q),
          );
        }
        if (path[0] === "operations" && deps.getOperation) {
          const byKey = path[1] === "by-key";
          if (path.length !== (byKey ? 3 : 2))
            throw new PlatformError(404, "NOT_FOUND", "Endpoint not found.");
          return response(
            await deps.getOperation(
              identifier(path[byKey ? 2 : 1]),
              byKey,
              integration.integrationId,
            ),
          );
        }
      }
      if (request.method === "POST") {
        if (!deps.policyReady || !deps.services.length || !deps.execute)
          throw new PlatformError(
            503,
            "ADMINISTRATION_NOT_READY",
            "Access enforcement is not ready for administration changes.",
          );
        if (
          !/^application\/json(?:;\s*charset=utf-8)?$/i.test(
            request.headers.get("content-type") ?? "",
          )
        )
          throw new PlatformError(415, "INVALID_CONTENT_TYPE", "Send JSON.");
        const size = request.headers.get("content-length");
        if (size && Number(size) > 16384)
          throw new PlatformError(
            413,
            "PAYLOAD_TOO_LARGE",
            "Request is too large.",
          );
        const reader = request.body?.getReader();
        if (!reader)
          throw new PlatformError(400, "INVALID_JSON", "JSON required.");
        let data = "",
          bytes = 0;
        const decoder = new TextDecoder();
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          bytes += chunk.value.byteLength;
          if (bytes > 16384) {
            await reader.cancel();
            throw new PlatformError(
              413,
              "PAYLOAD_TOO_LARGE",
              "Request is too large.",
            );
          }
          data += decoder.decode(chunk.value, { stream: true });
        }
        data += decoder.decode();
        let body: Record<string, unknown>;
        try {
          body = record(JSON.parse(data));
        } catch {
          throw new PlatformError(400, "INVALID_JSON", "Invalid JSON.");
        }
        const actorBody = record(body.actor),
          actor: AdminActor = {
            wmUserId: identifier(actorBody.wmUserId),
            correlationId: identifier(actorBody.correlationId),
            integrationId: integration.integrationId,
          };
        if (
          path[0] === "operations" &&
          path[2] === "reconcile" &&
          path.length === 3 &&
          deps.reconcile
        )
          return response(
            await deps.reconcile(
              identifier(path[1]),
              integration.integrationId,
            ),
          );
        if (path[0] === "commands" && path.length === 1)
          return response(
            await deps.execute(
              parseCommand(body.command),
              identifier(body.idempotencyKey),
              actor,
            ),
          );
        if (
          path[0] === "invitations" &&
          path[2] === "link" &&
          path.length === 3 &&
          deps.revealInvitation
        )
          return response(
            await deps.revealInvitation(identifier(path[1]), actor),
          );
      }
      throw new PlatformError(404, "NOT_FOUND", "Endpoint not found.");
    } catch (e) {
      return Response.json(
        e instanceof PlatformError
          ? { code: e.code, message: e.message }
          : {
              code: "ADMINISTRATION_UNAVAILABLE",
              message: "Platform administration is temporarily unavailable.",
            },
        { status: e instanceof PlatformError ? e.status : 503, headers },
      );
    }
  };
}
