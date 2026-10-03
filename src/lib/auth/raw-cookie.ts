import { headers } from "next/headers"

// The browser's Cookie header exactly as sent. Do not rebuild it from cookies().getAll():
// Next keeps the LAST cookie of a repeated name, Better Auth (and Handshake) the FIRST. With a
// stale duplicate session_token (e.g. one host-only on members.axxes.club and the shared
// .axxes.club one), Handshake saw a valid session and Members did not, so /sign-in and
// /dashboard redirected to each other forever.
export async function rawCookieHeader(): Promise<string> {
  return (await headers()).get("cookie") ?? ""
}
