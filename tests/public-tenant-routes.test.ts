import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { middleware } from '../src/middleware'

for (const path of [
 '/api/v1/public/tenants/coleccion-reyes-veray/inventory',
 '/api/v1/public/tenants/coleccion-reyes-veray/artists',
 '/api/v1/public/tenants/coleccion-reyes-veray/settings',
 '/api/v1/public/tenants/coleccion-reyes-veray/pages/about',
 '/api/v1/public/tenants/coleccion-reyes-veray/inquiries',
]) {
 test(`anonymous public tenant request reaches handler: ${path}`, () => {
  const response = middleware(new NextRequest(`https://members.axxes.club${path}`))
  assert.equal(response.headers.get('x-middleware-next'), '1')
  assert.equal(response.headers.get('location'), null)
 })
}
for (const path of ['/dashboard', '/api/v1/contacts', '/api/v1/tenants', '/api/v1/public/tenants-private/client/inventory']) {
 test(`private route still requires authentication: ${path}`, () => {
  const response = middleware(new NextRequest(`https://members.axxes.club${path}`))
  assert.equal(response.status, 307)
  assert.equal(new URL(response.headers.get('location')!).pathname, '/sign-in')
 })
}
