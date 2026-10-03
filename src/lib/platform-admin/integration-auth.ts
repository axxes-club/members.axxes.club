import { PlatformError } from "./contracts";
type Claims = {
  iss?: string;
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: boolean;
  exp?: number;
};
export function createIntegrationAuthenticator(config: {
  principal: string;
  subject: string;
  audience: string;
  verify?: (token: string) => Promise<Claims>;
}) {
  return async (request: Request) => {
    const match = /^Bearer ([A-Za-z0-9_.-]+)$/.exec(
      request.headers.get("authorization") ?? "",
    );
    if (!match || !config.principal || !config.subject || !config.audience)
      throw new PlatformError(
        401,
        "INTEGRATION_UNAUTHORIZED",
        "Service authentication required.",
      );
    let p: Claims;
    try {
      if (config.verify) p = await config.verify(match[1]);
      else {
        const { OAuth2Client } = await import("google-auth-library");
        p =
          (
            await new OAuth2Client().verifyIdToken({
              idToken: match[1],
              audience: config.audience,
            })
          ).getPayload() ?? {};
      }
    } catch {
      throw new PlatformError(
        401,
        "INTEGRATION_UNAUTHORIZED",
        "Invalid service authentication.",
      );
    }
    if (
      !["https://accounts.google.com", "accounts.google.com"].includes(
        p.iss ?? "",
      ) ||
      p.aud !== config.audience ||
      p.email !== config.principal ||
      p.sub !== config.subject ||
      p.email_verified !== true ||
      !p.exp ||
      p.exp * 1000 <= Date.now()
    )
      throw new PlatformError(
        403,
        "INTEGRATION_FORBIDDEN",
        "Service principal is not authorized.",
      );
    return { integrationId: config.principal };
  };
}
