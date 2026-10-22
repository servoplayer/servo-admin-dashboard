// Run with `npm test` (Node's built-in test runner, no extra dependencies).
import { afterEach, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { devicesApi, resellersApi, subscriptionsApi } from '../src/lib/services.js'

let calls
let nextResponse

const jsonResponse = (status, body) => ({ status, body })

beforeEach(() => {
  calls = []
  globalThis.localStorage = { getItem: () => 'tok', setItem() {}, removeItem() {} }
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    const r = typeof nextResponse === 'function' ? nextResponse() : nextResponse
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: async () => {
        if (r.body === undefined) throw new SyntaxError('Unexpected token <')
        return r.body
      },
    }
  }
})

afterEach(() => {
  delete globalThis.fetch
  delete globalThis.localStorage
})

const NO_SUBS = jsonResponse(404, { message: 'No subscriptions found yet' })

describe('admin: subscription lists treat "no subscriptions" 404 as empty', () => {
  for (const [name, call] of [
    ['GET /subscription/getAll', () => subscriptionsApi.list(1)],
    ['GET /subscription/searchByMac', () => subscriptionsApi.searchByMac('aa')],
    ['GET /admin/resellerSubscriptions', () => resellersApi.subscriptions('r1', 1)],
  ]) {
    it(`${name}: 404 "No subscriptions found yet" -> empty page`, async () => {
      nextResponse = NO_SUBS
      const res = await call()
      assert.equal(res.ok, true)
      assert.equal(res.empty, true)
      assert.deepEqual(res.data, { subscriptions: [], page: 1, totalPages: 0 })
    })
  }

  it('200 with an empty array is unchanged (same empty state)', async () => {
    nextResponse = jsonResponse(200, { subscriptions: [], page: 1, totalPages: 0 })
    const res = await subscriptionsApi.list(1)
    assert.equal(res.ok, true)
    assert.equal(res.empty, undefined)
    assert.deepEqual(res.data.subscriptions, [])
  })

  it('200 with subscriptions is passed through untouched', async () => {
    const subscriptions = [{ _id: 's1', cost: 25 }]
    nextResponse = jsonResponse(200, { subscriptions, page: 1, totalPages: 3 })
    const res = await subscriptionsApi.list(1)
    assert.equal(res.ok, true)
    assert.deepEqual(res.data.subscriptions, subscriptions)
    assert.equal(res.data.totalPages, 3)
  })

  it('keeps the request contract (URL and auth header)', async () => {
    nextResponse = NO_SUBS
    await resellersApi.subscriptions('r1', 2)
    assert.match(calls[0].url, /\/admin\/resellerSubscriptions\?page=2&id=r1$/)
    assert.equal(calls[0].init.headers.authorization, 'servoM0tok')
  })
})

describe('admin: genuine errors are preserved', () => {
  it('404 with a different message on a list endpoint stays an error', async () => {
    nextResponse = jsonResponse(404, { message: 'Reseller not found' })
    const res = await resellersApi.subscriptions('missing', 1)
    assert.equal(res.ok, false)
    assert.equal(res.status, 404)
    assert.equal(res.message, 'Reseller not found')
  })

  it('404 without a JSON body (unknown route) stays an error', async () => {
    nextResponse = jsonResponse(404, undefined)
    const res = await subscriptionsApi.list(1)
    assert.equal(res.ok, false)
    assert.equal(res.status, 404)
  })

  it('404 on a by-id subscription request is never normalized', async () => {
    nextResponse = jsonResponse(404, { message: 'No subscriptions found yet' })
    const res = await devicesApi.renew('missing-id', '25')
    assert.equal(res.ok, false)
    assert.equal(res.status, 404)
  })

  for (const status of [401, 403, 500]) {
    it(`${status} stays an error with the backend message`, async () => {
      nextResponse = jsonResponse(status, { message: `failure ${status}` })
      const res = await subscriptionsApi.list(1)
      assert.equal(res.ok, false)
      assert.equal(res.status, status)
      assert.equal(res.message, `failure ${status}`)
    })
  }

  it('network failure stays an error', async () => {
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch')
    }
    const res = await subscriptionsApi.list(1)
    assert.equal(res.ok, false)
    assert.equal(res.status, 0)
    assert.match(res.message, /Could not reach/)
  })
})
