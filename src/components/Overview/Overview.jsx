import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  FileText,
  KeyRound,
  MonitorSmartphone,
  Plus,
  ReceiptText,
  Search,
  Tag,
  UserPlus,
  Users,
} from 'lucide-react'
import { Card, CardHeader, PageHeader } from '../ui/Card'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { EmptyState, ErrorState, Skeleton } from '../ui/States'
import { SkeletonRows, Table, TableMessage, Td, Th, Tr } from '../ui/Table'
import { useShell } from '../Layout/ShellContext'
import useDeviceActions from '../Devices/useDeviceActions'
import {
  priceValue,
  splitByExpiry,
  useDevicesFirstPage,
  usePaymentKeys,
  usePrice,
  useRecentSubscriptions,
  useResellers,
} from '../../lib/dashboardData'
import {
  EXPIRING_SOON_DAYS,
  formatAmount,
  formatDate,
  formatDeviceType,
  formatNumber,
  relativeDays,
  subscriptionStatus,
} from '../../lib/format'
import { cx } from '../ui/cx'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function Kpi({ label, icon: Icon, value, sub, to, loading, error, tone }) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <p className="truncate text-[13px] font-semibold text-muted">{label}</p>
        <span
          className={cx(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            tone === 'danger' ? 'bg-danger-soft text-danger' : tone === 'warning' ? 'bg-warning-soft text-warning' : 'bg-brand-soft text-brand',
          )}
        >
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>
      {loading ? (
        <>
          <Skeleton className="mt-3 h-7 w-20" />
          <Skeleton className="mt-2 h-3 w-32" />
        </>
      ) : error ? (
        <p className="mt-3 text-[13px] text-danger">Unavailable — {error}</p>
      ) : (
        <>
          <p className="mt-2 truncate text-xl font-bold tracking-tight text-fg tabular sm:text-2xl">{value}</p>
          {sub && <p className="mt-1 line-clamp-2 text-xs text-muted sm:truncate">{sub}</p>}
        </>
      )}
    </>
  )
  const cls = 'block min-w-0 rounded-xl border border-line bg-surface p-3.5 shadow-card transition-colors sm:p-4'
  return to ? (
    <Link to={to} className={cx(cls, 'hover:border-brand/40')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

const QUICK_ACTIONS = [
  { label: 'Activate a device', hint: 'Start a yearly subscription', icon: Plus, to: '/layout/customer?tab=devices' },
  { label: 'Find a device', hint: 'Search by MAC address', icon: Search, to: '/layout/customer?tab=devices', focusSearch: true },
  { label: 'Add a reseller', hint: 'Create a partner account', icon: UserPlus, to: '/layout/reseller?new=1' },
  { label: 'Review transactions', hint: 'Payments and expiry dates', icon: ReceiptText, to: '/layout/customer?tab=transactions' },
  { label: 'Update pricing', hint: 'Activation price & keys', icon: Tag, to: '/layout/activation' },
  { label: 'Edit app content', hint: 'FAQs, terms, privacy', icon: FileText, to: '/layout/editContent' },
]

export default function Overview() {
  const { admin } = useShell()
  const { hash } = useLocation()
  const navigate = useNavigate()
  const price = usePrice()
  const keys = usePaymentKeys()
  const devices = useDevicesFirstPage()
  const subs = useRecentSubscriptions()
  const resellers = useResellers()
  const { open: openAction, dialogs } = useDeviceActions()

  useEffect(() => {
    if (hash === '#attention') document.getElementById('attention')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

  // ---- KPI derivations (only from data the API actually returns) ----
  const resellerList = resellers.data?.allResellers ?? []
  const blocked = resellerList.filter((r) => r.block).length

  const p = priceValue(price.data)
  const priceSet = p !== undefined && p !== null && p !== '' && Number(p) > 0
  const priceNeedsSetting = !price.loading && !price.error && !priceSet

  const k = keys.data?.keys
  const keysReady = Boolean(k?.publishableKey && k?.secretKey)
  const keysMissing = keys.status === 404 || (keys.data && !keysReady)

  const deviceList = devices.data?.users ?? []
  const deviceTotalPages = Number(devices.data?.totalPages) || 0
  const exactDeviceTotal = devices.data?.total ?? devices.data?.totalUsers ?? devices.data?.count
  const deviceValue =
    exactDeviceTotal !== undefined
      ? formatNumber(exactDeviceTotal)
      : `${formatNumber(deviceList.length)}${deviceTotalPages > 1 ? '+' : ''}`
  const subscribedOnPage = deviceList.filter((d) => d.isSubscribed).length

  const { expiring, expired } = splitByExpiry(deviceList)
  const attention = [...expired, ...expiring]

  const recent = (subs.data?.subscriptions ?? []).slice(0, 8)

  return (
    <>
      <PageHeader
        title={`${greeting()}${admin?.userName ? `, ${admin.userName}` : ''}`}
        description="Account health, what needs attention, and the latest activity across Servo."
        actions={
          <>
            <Button variant="secondary" icon={UserPlus} onClick={() => navigate('/layout/reseller?new=1')}>
              New reseller
            </Button>
            <Button icon={Plus} onClick={() => navigate('/layout/customer?tab=devices')}>
              Activate device
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi
          label="Devices"
          icon={MonitorSmartphone}
          to="/layout/customer?tab=devices"
          loading={devices.loading}
          error={devices.error}
          value={deviceValue}
          sub={
            deviceTotalPages > 1
              ? `${deviceTotalPages} pages · ${subscribedOnPage} of ${deviceList.length} subscribed on page 1`
              : `${subscribedOnPage} subscribed`
          }
        />
        <Kpi
          label="Resellers"
          icon={Users}
          to="/layout/reseller"
          loading={resellers.loading}
          error={resellers.error}
          value={formatNumber(resellerList.length)}
          sub={blocked ? `${blocked} blocked` : 'None blocked'}
        />
        <Kpi
          label="Activation price"
          icon={Tag}
          to="/layout/activation"
          loading={price.loading}
          error={price.error}
          tone={priceSet ? undefined : 'warning'}
          value={priceSet ? formatAmount(p) : 'Not set'}
          sub="Per yearly subscription"
        />
        <Kpi
          label="Payment setup"
          icon={KeyRound}
          to="/layout/activation"
          loading={keys.loading}
          error={keys.status === 404 ? '' : keys.error}
          tone={keysMissing ? 'danger' : undefined}
          value={keysMissing ? 'Incomplete' : 'Ready'}
          sub={keysMissing ? 'Publishable or secret key missing' : 'Publishable & secret keys saved'}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card id="attention" className="scroll-mt-24">
            <CardHeader
              icon={CalendarClock}
              title="Needs attention"
              description={`Subscriptions past their end date or expiring within ${EXPIRING_SOON_DAYS} days, from the first page of devices.`}
              actions={
                <Link to="/layout/customer?tab=devices" className="flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline">
                  All devices <ArrowRight size={14} aria-hidden="true" />
                </Link>
              }
            />
            {devices.loading ? (
              <div className="space-y-3 p-5">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : devices.error ? (
              <ErrorState message={devices.error} onRetry={devices.reload} className="py-8" />
            ) : attention.length === 0 && !keysMissing && !priceNeedsSetting ? (
              <EmptyState
                icon={CheckCircle2}
                title="Nothing needs attention"
                description="No expired or soon-to-expire subscriptions on the first page of devices."
                className="py-8"
              />
            ) : (
              <ul className="divide-y divide-line">
                {keysMissing && (
                  <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
                      <CreditCard size={15} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-fg">Payment keys are not configured</p>
                      <p className="text-xs text-muted">Customers can&apos;t pay for activations until both keys are saved.</p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => navigate('/layout/activation')}>Fix</Button>
                  </li>
                )}
                {priceNeedsSetting && (
                  <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning">
                      <Tag size={15} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-fg">Activation price is not set</p>
                      <p className="text-xs text-muted">Set the yearly price shown to customers.</p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => navigate('/layout/activation')}>Set price</Button>
                  </li>
                )}
                {attention.map((d) => {
                  const status = subscriptionStatus(d.endDate)
                  return (
                    <li key={d._id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                      <span
                        className={cx(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                          status.tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning',
                        )}
                      >
                        {status.tone === 'danger' ? <CircleAlert size={15} aria-hidden="true" /> : <CalendarClock size={15} aria-hidden="true" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[13px] font-semibold text-fg">{d.macAddress}</p>
                        <p className="text-xs text-muted">
                          {formatDeviceType(d.type)} · {status.tone === 'danger' ? 'Ended' : 'Ends'} {formatDate(d.endDate)} ({relativeDays(d.endDate)})
                        </p>
                      </div>
                      <Badge tone={status.tone} className="hidden sm:inline-flex">{status.label}</Badge>
                      <Button size="sm" icon={CalendarClock} onClick={() => openAction('renew', d)}>
                        Renew
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              icon={ReceiptText}
              title="Recent transactions"
              description="Latest subscription payments."
              actions={
                <Link to="/layout/customer?tab=transactions" className="flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline">
                  View all <ArrowRight size={14} aria-hidden="true" />
                </Link>
              }
            />
            <Table caption="Recent transactions" minWidth={0}>
              <thead>
                <tr>
                  <Th>MAC address</Th>
                  <Th className="hidden md:table-cell">Device</Th>
                  <Th align="right">Amount</Th>
                  <Th className="hidden sm:table-cell">Paid</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {subs.loading ? (
                  <SkeletonRows rows={5} cols={5} />
                ) : subs.error ? (
                  <TableMessage cols={5}>
                    <ErrorState message={subs.error} onRetry={subs.reload} />
                  </TableMessage>
                ) : recent.length === 0 ? (
                  <TableMessage cols={5}>
                    <EmptyState title="No subscriptions found yet" description="Payments appear here once devices are activated." />
                  </TableMessage>
                ) : (
                  recent.map((item, i) => {
                    const status = subscriptionStatus(item.subscriptionEndDate)
                    return (
                      <Tr key={item._id ?? i}>
                        <Td>
                          <span className="block font-mono text-[13px]">{item.userId?.macAddress ?? '—'}</span>
                          <span className="mt-0.5 block text-xs text-muted md:hidden">
                            {formatDeviceType(item.userId?.type)}<span className="sm:hidden"> · {formatDate(item.time)}</span>
                          </span>
                        </Td>
                        <Td className="hidden text-muted md:table-cell">{formatDeviceType(item.userId?.type)}</Td>
                        <Td align="right" className="font-semibold tabular">{formatAmount(item.cost)}</Td>
                        <Td className="hidden whitespace-nowrap text-muted sm:table-cell">{formatDate(item.time)}</Td>
                        <Td>
                          <Badge tone={status.tone}>{status.label}</Badge>
                        </Td>
                      </Tr>
                    )
                  })
                )}
              </tbody>
            </Table>
          </Card>
        </div>

        <Card className="self-start">
          <CardHeader title="Quick actions" description="Jump straight into frequent tasks." />
          <ul className="grid grid-cols-1 gap-1 p-2 sm:grid-cols-2 xl:grid-cols-1">
            {QUICK_ACTIONS.map((a) => (
              <li key={a.label}>
                <Link
                  to={a.to}
                  state={a.focusSearch ? { focusSearch: true } : undefined}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-2"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-brand-fg">
                    <a.icon size={17} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-fg">{a.label}</span>
                    <span className="block truncate text-xs text-muted">{a.hint}</span>
                  </span>
                  <ArrowRight size={15} className="text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {dialogs}
    </>
  )
}
