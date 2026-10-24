// Run with `npm test` (Node's built-in test runner, no extra dependencies).
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { filterResellers, sortResellers, withHierarchy } from '../src/lib/resellers.js'
import { niceTicks } from '../src/lib/chartScale.js'

// Shape of /reseller/get: main and sub-resellers in one list, newest first.
const LIST = [
  { _id: 's2', userName: 'Delta', email: 'd@x.io', subscriptionsNum: 60, currentDate: '2026-05-25', createdBy: 'm1', block: false },
  { _id: 'm2', userName: 'atlas', email: 'a@x.io', subscriptionsNum: 830, currentDate: '2025-10-07', block: true },
  { _id: 's1', userName: 'Cairo', email: 'c@x.io', subscriptionsNum: 220, currentDate: '2026-04-05', createdBy: 'm1', block: false },
  { _id: 'm1', userName: 'Nile', email: 'n@x.io', subscriptionsNum: 1240, currentDate: '2025-08-28', block: false },
  { _id: 's3', userName: 'Orphan', email: 'o@x.io', subscriptionsNum: 0, currentDate: '2026-07-24', createdBy: 'gone', block: false },
]

describe('withHierarchy', () => {
  const all = withHierarchy(LIST)
  const byId = Object.fromEntries(all.map((r) => [r._id, r]))

  it('marks accounts with createdBy as sub-resellers', () => {
    assert.equal(byId.m1.type, 'main')
    assert.equal(byId.s1.type, 'sub')
  })

  it('links parents and children', () => {
    assert.equal(byId.s1.parent.userName, 'Nile')
    assert.deepEqual(byId.m1.children.map((c) => c._id), ['s2', 's1'])
    assert.deepEqual(byId.m2.children, [])
  })

  it('keeps a sub-reseller whose parent is missing, without a parent', () => {
    assert.equal(byId.s3.type, 'sub')
    assert.equal(byId.s3.parent, null)
  })

  it('does not mutate the API data', () => {
    assert.equal(LIST[0].type, undefined)
  })
})

describe('filterResellers', () => {
  const all = withHierarchy(LIST)
  const ids = (rows) => rows.map((r) => r._id)

  it('filters by type and status', () => {
    assert.deepEqual(ids(filterResellers(all, { type: 'main' })), ['m2', 'm1'])
    assert.deepEqual(ids(filterResellers(all, { status: 'blocked' })), ['m2'])
    assert.deepEqual(ids(filterResellers(all, { type: 'sub', status: 'active' })), ['s2', 's1', 's3'])
  })

  it('searches name, email and parent name, case-insensitively', () => {
    assert.deepEqual(ids(filterResellers(all, { q: 'ATLAS' })), ['m2'])
    assert.deepEqual(ids(filterResellers(all, { q: 'nile' })), ['s2', 's1', 'm1'])
  })
})

describe('sortResellers', () => {
  const ids = (rows) => rows.map((r) => r._id)

  it('sorts by credits numerically in both directions', () => {
    assert.deepEqual(ids(sortResellers(LIST, 'credits', 'desc')), ['m1', 'm2', 's1', 's2', 's3'])
    assert.deepEqual(ids(sortResellers(LIST, 'credits', 'asc')), ['s3', 's2', 's1', 'm2', 'm1'])
  })

  it('sorts names case-insensitively', () => {
    assert.deepEqual(ids(sortResellers(LIST, 'name')), ['m2', 's1', 's2', 'm1', 's3'])
  })

  it('returns the list unchanged for an unknown key', () => {
    assert.equal(sortResellers(LIST, 'nope'), LIST)
  })
})

describe('niceTicks', () => {
  it('covers the maximum with round steps from zero', () => {
    assert.deepEqual(niceTicks(270), [0, 100, 200, 300])
    assert.deepEqual(niceTicks(7), [0, 2, 4, 6, 8])
  })

  it('handles an all-zero series', () => {
    assert.deepEqual(niceTicks(0), [0, 1])
  })
})
