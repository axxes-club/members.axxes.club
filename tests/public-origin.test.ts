import { test } from "node:test"
import assert from "node:assert/strict"
import { publicOrigin } from "../src/lib/public-origin"

const req = (url: string, headers: Record<string, string> = {}) => new Request(url, { headers })

test("uses the public Host header instead of Cloud Run's listen address", () => {
  assert.equal(publicOrigin(req("https://0.0.0.0:8080/api/v1/tenants/select", { host: "v2.axxes.app" })), "https://v2.axxes.app")
})
test("prefers x-forwarded-host when a proxy sets it", () => {
  assert.equal(publicOrigin(req("https://0.0.0.0:8080/x", { host: "internal", "x-forwarded-host": "members.axxes.club" })), "https://members.axxes.club")
})
test("falls back to the request URL when the host is the container itself", () => {
  assert.equal(publicOrigin(req("https://0.0.0.0:8080/x", { host: "0.0.0.0:8080" })), "https://0.0.0.0:8080")
})
test("keeps plain http for localhost development", () => {
  assert.equal(publicOrigin(req("http://localhost:3000/x", { host: "localhost:3000", "x-forwarded-proto": "http" })), "http://localhost:3000")
})
test("never downgrades a public host to http", () => {
  assert.equal(publicOrigin(req("https://0.0.0.0:8080/x", { host: "v2.axxes.app", "x-forwarded-proto": "http" })), "https://v2.axxes.app")
})
