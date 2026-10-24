import { emptyListOnNoSubscriptions, qs, request } from './api.js'

// One function per existing backend endpoint. URLs, verbs and payloads match
// what the dashboard already sent before the redesign.

export const authApi = {
  login: (email, password) => request('/admin/login', { method: 'POST', auth: false, body: { email, password } }),
  info: (opts) => request('/admin/info', opts),
  update: (body) => request('/admin/update', { method: 'PUT', body }),
}

export const devicesApi = {
  list: (page, opts) => request(`/user/get${qs({ page })}`, opts),
  searchByMac: (macAddress, opts) => request(`/user/search${qs({ macAddress })}`, opts),
  activate: (id, cost) =>
    request(`/dashboard/subscription/${id}`, { method: 'POST', body: { subscriptionType: 'yearly', cost } }),
  renew: (id, cost) =>
    request(`/dashboard/renewSubscription/${id}`, { method: 'PUT', body: { subscriptionType: 'yearly', cost } }),
  deactivate: (id) => request(`/dashboard/stopSubscription/${id}`, { method: 'PUT' }),
}

export const subscriptionsApi = {
  list: (page, opts) => request(`/subscription/getAll${qs({ page })}`, opts).then(emptyListOnNoSubscriptions),
  searchByMac: (macAddress, opts) =>
    request(`/subscription/searchByMac${qs({ macAddress })}`, opts).then(emptyListOnNoSubscriptions),
}

export const resellersApi = {
  // The original screen requested `?page=undefined` (no pagination UI); the
  // exact query is kept so the backend keeps returning the same result set.
  list: (opts) => request('/reseller/get?page=undefined', opts),
  create: (body) => request('/admin/createReseller', { method: 'POST', body }),
  update: (id, body) => request(`/reseller/update/${id}`, { method: 'PUT', body }),
  toggleBlock: (id) => request(`/admin/blockReseller/${id}`, { method: 'PUT' }),
  subscriptions: (id, page, opts) =>
    request(`/admin/resellerSubscriptions${qs({ page, id })}`, opts).then(emptyListOnNoSubscriptions),
}

// Read-only aggregates for the overview charts (dashboard-only endpoint).
export const statsApi = {
  overview: (opts) => request('/admin/stats', opts),
}

export const pricingApi = {
  getPrice: (opts) => request('/price/get', { auth: false, ...opts }),
  setPrice: (price) => request('/price/add', { method: 'POST', body: { price } }),
  getKeys: (opts) => request('/apiKey/get', opts),
  setKeys: (publishableKey, secretKey) =>
    request('/apiKey/add', { method: 'POST', body: { publishableKey, secretKey } }),
}

export const contentApi = {
  getFaqs: (opts) => request('/faq/get', { auth: false, ...opts }),
  addFaq: (question, answer) => request('/faq/add', { method: 'POST', body: { question, answer } }),
  updateFaq: (id, question, answer) => request(`/faq/update/${id}`, { method: 'PUT', body: { question, answer } }),
  deleteFaq: (id) => request(`/faq/delete/${id}`, { method: 'DELETE' }),
  getPage: (page, opts) => request(`/footerContent/get${qs({ page })}`, { auth: false, ...opts }),
  savePage: (page, content) => request('/footerContent/add', { method: 'POST', body: { content, page } }),
  getDemo: (opts) => request('/demo/get', { auth: false, ...opts }),
  setDemo: (url) => request('/demo/add', { method: 'POST', body: { url } }),
}
