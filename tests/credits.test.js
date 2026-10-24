// Run with `npm test`. Credit changes reuse PUT /reseller/update/:id with the same body the edit form sends.
import { afterEach, beforeEach, it } from 'node:test'
import assert from 'node:assert/strict'
import { resellersApi, statsApi } from '../src/lib/services.js'
import { updateBody } from '../src/lib/resellers.js'

let calls
beforeEach(() => {
  calls = []
  globalThis.localStorage = { getItem: () => 'tok', setItem() {}, removeItem() {} }
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    return { ok: true, status: 200, json: async () => ({ message: 'ok' }) }
  }
})

afterEach(() => {
  delete globalThis.fetch
  delete globalThis.localStorage
})

it('adjusting credits sends only the listed account fields and the new balance', async () => {
  const reseller = { _id: 'r1', userName: 'Nile', email: 'n@x.io', subscriptionsNum: 10, block: false, createdBy: 'm1' }
  await resellersApi.update(reseller._id, updateBody(reseller, { subscriptionsNum: 15 }))
  assert.equal(calls.length, 1)
  assert.ok(calls[0].url.endsWith('/reseller/update/r1'))
  assert.equal(calls[0].init.method, 'PUT')
  // `password: undefined` is dropped by JSON, so the backend keeps the current password.
  assert.deepEqual(JSON.parse(calls[0].init.body), { email: 'n@x.io', userName: 'Nile', subscriptionsNum: 15 })
  assert.equal(calls[0].init.headers.authorization, 'servoM0tok')
})

it('stats use the admin-only GET /admin/stats endpoint with the admin token', async () => {
  await statsApi.overview()
  assert.ok(calls[0].url.endsWith('/admin/stats'))
  assert.equal(calls[0].init.method, 'GET')
  assert.equal(calls[0].init.headers.authorization, 'servoM0tok')
})
