import { useCallback, useMemo, useState } from 'react'
import { useResource } from './resource'
import { creditsApi, devicesApi, pricingApi, resellersApi, statsApi, subscriptionsApi } from './services'
import { daysUntil, EXPIRING_SOON_DAYS } from './format'

// Shared read models. Keys are prefixes used by `invalidate()` after mutations.
export const usePrice = () => useResource('price', pricingApi.getPrice)
export const usePaymentKeys = () => useResource('keys', pricingApi.getKeys)
export const useDevicesFirstPage = () => useResource('devices:1', () => devicesApi.list(1))
export const useRecentSubscriptions = () => useResource('subscriptions:1', () => subscriptionsApi.list(1))
export const useResellers = () => useResource('resellers', resellersApi.list)
export const useStats = () => useResource('stats', statsApi.overview)
export const useManagers = () => useResource('managers', creditsApi.managers)

/** Ids of distributor manager accounts; empty while loading or if the server is not updated yet. */
export const managerIdsOf = (managers) => new Set((managers.data?.managers ?? []).map((m) => m._id))

/** Exact total from a paged list response (`totalItems`), when the API sent one. */
export const totalOf = (data) => data?.totalItems ?? data?.total ?? data?.count

export const priceValue = (data) => data?.subscriptionPrice?.price

/** Subscribed devices whose end date is within the warning window or already past. */
export function splitByExpiry(devices = []) {
  const expiring = []
  const expired = []
  devices.forEach((d) => {
    if (!d?.isSubscribed) return
    const days = daysUntil(d.endDate)
    if (days === null) return
    if (days < 0) expired.push(d)
    else if (days <= EXPIRING_SOON_DAYS) expiring.push(d)
  })
  const byDate = (a, b) => new Date(a.endDate) - new Date(b.endDate)
  return { expiring: expiring.sort(byDate), expired: expired.sort(byDate) }
}

const READ_KEY = 'servo-alerts-read'

function readMarks() {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY)) || {}
  } catch {
    return {}
  }
}

/**
 * Operational alerts derived from live API data. The backend has no
 * notification service, so alerts are computed on the client; read state is
 * remembered per browser and resets automatically when an alert's content
 * changes (its signature differs).
 */
export function useAlerts() {
  const keys = usePaymentKeys()
  const price = usePrice()
  const devices = useDevicesFirstPage()
  const [marks, setMarks] = useState(readMarks)

  const alerts = useMemo(() => {
    const list = []
    const k = keys.data?.keys
    const keysMissing = (!keys.loading && keys.status === 404) || (keys.data && (!k?.publishableKey || !k?.secretKey))
    if (keysMissing) {
      list.push({
        id: 'payment-keys',
        signature: 'missing',
        tone: 'danger',
        title: 'Payment keys are not configured',
        body: 'Customers cannot pay for activations until both the publishable and secret keys are saved.',
        to: '/layout/activation',
        cta: 'Add keys',
      })
    }
    const p = priceValue(price.data)
    if (!price.loading && !price.error && (p === undefined || p === null || p === '' || Number(p) <= 0)) {
      list.push({
        id: 'price',
        signature: String(p),
        tone: 'warning',
        title: 'Activation price is not set',
        body: 'Set the yearly price customers pay to activate Servo.',
        to: '/layout/activation',
        cta: 'Set price',
      })
    }
    const { expiring, expired } = splitByExpiry(devices.data?.users)
    if (expired.length) {
      list.push({
        id: 'expired',
        signature: expired.map((d) => d._id).join(','),
        tone: 'danger',
        title: `${expired.length} subscription${expired.length > 1 ? 's' : ''} past the end date`,
        body: 'Still marked as subscribed on the first page of devices. Renew or deactivate them.',
        to: '/layout#attention',
        cta: 'Review',
      })
    }
    if (expiring.length) {
      list.push({
        id: 'expiring',
        signature: expiring.map((d) => d._id).join(','),
        tone: 'warning',
        title: `${expiring.length} device${expiring.length > 1 ? 's' : ''} expiring within ${EXPIRING_SOON_DAYS} days`,
        body: 'Found on the first page of devices. Renew before customers lose access.',
        to: '/layout#attention',
        cta: 'Renew',
      })
    }
    return list.map((a) => ({ ...a, read: marks[a.id] === a.signature }))
  }, [keys.data, keys.loading, keys.status, price.data, price.loading, price.error, devices.data, marks])

  const persist = (next) => {
    setMarks(next)
    try {
      localStorage.setItem(READ_KEY, JSON.stringify(next))
    } catch {
      // Read state is a convenience; ignore storage failures.
    }
  }

  const markRead = useCallback(
    (alert) => persist({ ...readMarks(), [alert.id]: alert.signature }),
    [],
  )
  const markAllRead = useCallback(
    () => persist(alerts.reduce((acc, a) => ({ ...acc, [a.id]: a.signature }), readMarks())),
    [alerts],
  )

  return {
    alerts,
    unread: alerts.filter((a) => !a.read).length,
    loading: keys.loading || price.loading || devices.loading,
    markRead,
    markAllRead,
  }
}
