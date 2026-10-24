// Helpers for the reseller list. `/reseller/get` returns main resellers and
// sub-resellers together; a sub-reseller is the one with `createdBy` (its parent's id).

export const isSubReseller = (r) => Boolean(r?.createdBy)

// `subscriptionsNum` is the reseller's credit balance: /reseller/newSubscription
// takes 1 credit for a 1-year activation and 2 for lifetime.
export const CREDITS_HINT = 'Activation credits: 1 per 1-year activation, 2 per lifetime.'

/**
 * Adds `type` ('main' | 'sub' | 'manager'), `parent` and `children` to every
 * reseller from the flat list. `/reseller/get` does not return roles, so
 * distributor managers are identified from /admin/distributorManagers.
 */
export function withHierarchy(list = [], managerIds = new Set()) {
  const byId = new Map(list.map((r) => [r._id, r]))
  const children = new Map()
  list.forEach((r) => {
    if (!r.createdBy) return
    if (!children.has(r.createdBy)) children.set(r.createdBy, [])
    children.get(r.createdBy).push(r)
  })
  return list.map((r) => ({
    ...r,
    type: managerIds.has(r._id) ? 'manager' : isSubReseller(r) ? 'sub' : 'main',
    parent: r.createdBy ? byId.get(r.createdBy) ?? null : null,
    children: children.get(r._id) ?? [],
  }))
}

export const RESELLER_SORTS = {
  name: (r) => (r.userName || r.email || '').toLowerCase(),
  credits: (r) => Number(r.subscriptionsNum) || 0,
  created: (r) => r.currentDate || '',
}

/** Stable sort by one of RESELLER_SORTS; ties keep the API order (newest first). */
export function sortResellers(list, key, dir = 'asc') {
  const get = RESELLER_SORTS[key]
  if (!get) return list
  const sign = dir === 'desc' ? -1 : 1
  return list
    .map((r, i) => [r, i])
    .sort(([a, ai], [b, bi]) => {
      const va = get(a)
      const vb = get(b)
      if (va < vb) return -sign
      if (va > vb) return sign
      return ai - bi
    })
    .map(([r]) => r)
}

/** Filters by free text (name/email/parent name), type (main|sub|manager) and status (active|blocked). */
export function filterResellers(list, { q = '', type = 'all', status = 'all' } = {}) {
  const needle = q.trim().toLowerCase()
  return list.filter((r) => {
    if (type !== 'all' && r.type !== type) return false
    if (status === 'blocked' && !r.block) return false
    if (status === 'active' && r.block) return false
    if (!needle) return true
    return [r.userName, r.email, r.parent?.userName].some((v) => v?.toLowerCase().includes(needle))
  })
}
