// Run with `npm test`. Credit changes go through the audited credit endpoints,
// never through PUT /reseller/update (which would overwrite the balance).
import { afterEach, beforeEach, it } from 'node:test'
import assert from 'node:assert/strict'
import { creditsApi, statsApi } from '../src/lib/services.js'
import { withHierarchy } from '../src/lib/resellers.js'

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

it('adding credits posts the amount and idempotency key to the audited endpoint', async () => {
  await creditsApi.recharge('r1', 15, 'key-12345678', 'Paid by transfer')
  assert.equal(calls.length, 1)
  assert.ok(calls[0].url.endsWith('/admin/credits/recharge'))
  assert.equal(calls[0].init.method, 'POST')
  assert.deepEqual(JSON.parse(calls[0].init.body), { resellerId: 'r1', amount: 15, idempotencyKey: 'key-12345678', note: 'Paid by transfer' })
  assert.equal(calls[0].init.headers.authorization, 'servoM0tok')
})

it('removing credits uses the deduct endpoint and never sends a balance', async () => {
  await creditsApi.deduct('r1', 3, 'key-abcdefgh')
  assert.ok(calls[0].url.endsWith('/admin/credits/deduct'))
  const body = JSON.parse(calls[0].init.body)
  assert.equal(body.subscriptionsNum, undefined)
  assert.equal(body.amount, 3)
})

it('role changes send an explicit boolean', async () => {
  await creditsApi.setManager('r9', true)
  assert.ok(calls[0].url.endsWith('/admin/distributorManager/r9'))
  assert.equal(calls[0].init.method, 'PUT')
  assert.deepEqual(JSON.parse(calls[0].init.body), { grant: true })
})

it('marks distributor managers in the reseller list', () => {
  const all = withHierarchy([{ _id: 'a' }, { _id: 'm' }, { _id: 's', createdBy: 'a' }], new Set(['m']))
  assert.deepEqual(all.map((r) => r.type), ['main', 'manager', 'sub'])
})

it('stats use the admin-only GET /admin/stats endpoint with the admin token', async () => {
  await statsApi.overview()
  assert.ok(calls[0].url.endsWith('/admin/stats'))
  assert.equal(calls[0].init.method, 'GET')
  assert.equal(calls[0].init.headers.authorization, 'servoM0tok')
})
