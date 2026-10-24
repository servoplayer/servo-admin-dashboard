const DAY = 24 * 60 * 60 * 1000

/** Parses a backend date value; returns null when it is missing or unparseable. */
export function parseDate(value) {
  if (value === undefined || value === null || value === '') return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const dateFmt = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** Formats a date; falls back to the raw value if the backend sent a non-date string. */
export function formatDate(value, { withTime = false } = {}) {
  const date = parseDate(value)
  if (!date) return value ? String(value) : '—'
  return (withTime ? dateTimeFmt : dateFmt).format(date)
}

/** Whole days from now until the given date (negative when in the past). */
export function daysUntil(value) {
  const date = parseDate(value)
  if (!date) return null
  return Math.ceil((date.getTime() - Date.now()) / DAY)
}

export function relativeDays(value) {
  const days = daysUntil(value)
  if (days === null) return ''
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  return days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`
}

/** Formats an amount; the backend stores plain numbers without a currency code. */
export function formatAmount(value) {
  if (value === undefined || value === null || value === '') return '—'
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export const formatNumber = (value) =>
  value === undefined || value === null ? '—' : Number(value).toLocaleString()

/** MAC addresses are compared without separators and case. */
export const normalizeMac = (value = '') => value.replace(/[^a-fA-F0-9]/g, '').toLowerCase()

/** Device types are stored with inconsistent casing (e.g. "lg", "LG"). */
export function formatDeviceType(type) {
  if (!type) return '—'
  const lower = String(type).toLowerCase()
  if (lower === 'lg') return 'LG'
  if (lower === 'ios') return 'iOS'
  if (lower === 'android_tv') return 'Android TV'
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/**
 * When a subscription record was created (i.e. paid). The API stores `time` as
 * "HH:mm:ss" only, and a renewal's start date is the previous end date, so the
 * creation time embedded in the MongoDB ObjectId is used; start date is the fallback.
 */
export function paidAt(item) {
  const id = String(item?._id ?? '')
  if (/^[a-f0-9]{24}$/i.test(id)) return new Date(parseInt(id.slice(0, 8), 16) * 1000)
  return item?.subscriptionStartDate
}

/** Lifetime activations are stored with an end date in the year 3025. */
export const isLifetime = (endDate) => (parseDate(endDate)?.getFullYear() ?? 0) >= 3000

export const EXPIRING_SOON_DAYS = 30

/** Subscription status derived from the end date. */
export function subscriptionStatus(endDate) {
  const days = daysUntil(endDate)
  if (days === null) return { tone: 'neutral', label: 'Unknown' }
  if (days < 0) return { tone: 'danger', label: 'Expired' }
  if (days <= EXPIRING_SOON_DAYS) return { tone: 'warning', label: 'Expiring soon' }
  return { tone: 'success', label: 'Active' }
}
