import { useMemo, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  ChevronRight,
  Coins,
  CornerDownRight,
  History,
  IdCard,
  KeyRound,
  Minus,
  Pencil,
  Plus,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { Card } from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Tabs from '../ui/Tabs'
import { EmptyState, ErrorState, Skeleton } from '../ui/States'
import { Table, Td, Th, Tr } from '../ui/Table'
import ResellerCustomer from '../ResellerCustomer/ResellerCustomer'
import { TypeBadge } from '../Reseller/Reseller'
import { BlockDialog, CreditsDialog, ManagerRoleDialog, ResellerForm } from '../Reseller/ResellerDialogs'
import CreditLedger from '../Credits/CreditLedger'
import { managerIdsOf, totalOf, useManagers, useResellers } from '../../lib/dashboardData'
import { withHierarchy } from '../../lib/resellers'
import { useResource } from '../../lib/resource'
import { resellersApi } from '../../lib/services'
import { formatDate, formatNumber } from '../../lib/format'

function Stat({ label, icon: Icon, children, sub, action }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface p-3.5 shadow-card sm:p-4">
      <div className="flex items-center justify-between">
        <p className="truncate text-[13px] font-semibold text-muted">{label}</p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>
      <div className="mt-2 truncate text-xl font-bold tracking-tight text-fg tabular sm:text-2xl">{children}</div>
      {sub && <p className="mt-1 truncate text-xs text-muted">{sub}</p>}
      {action && <div className="mt-3 flex gap-2">{action}</div>}
    </div>
  )
}

function SubResellers({ reseller }) {
  if (!reseller.children.length) {
    return (
      <EmptyState
        icon={UserPlus}
        title="No sub-resellers"
        description={`${reseller.userName} creates sub-resellers from their own reseller portal.`}
        className="py-10"
      />
    )
  }
  return (
    <Table caption="Sub-resellers" minWidth={0}>
      <thead>
        <tr>
          <Th>Sub-reseller</Th>
          <Th align="right">Credits</Th>
          <Th className="hidden sm:table-cell">Created</Th>
          <Th className="hidden sm:table-cell">Status</Th>
          <Th align="right"><span className="sr-only">Open</span></Th>
        </tr>
      </thead>
      <tbody>
        {reseller.children.map((s) => (
          <Tr key={s._id}>
            <Td>
              <p className="truncate font-semibold">{s.userName}</p>
              <p className="truncate text-xs text-muted">{s.email}</p>
            </Td>
            <Td align="right" className="font-semibold tabular">{formatNumber(s.subscriptionsNum)}</Td>
            <Td className="hidden whitespace-nowrap text-muted sm:table-cell">{formatDate(s.currentDate)}</Td>
            <Td className="hidden sm:table-cell">{s.block ? <Badge tone="danger">Blocked</Badge> : <Badge tone="success">Active</Badge>}</Td>
            <Td align="right">
              <Link
                to={`/layout/reseller/${s._id}`}
                className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-brand hover:bg-brand-soft"
                aria-label={`Open ${s.userName}`}
              >
                <span className="max-sm:sr-only">Open</span> <ChevronRight size={15} aria-hidden="true" />
              </Link>
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  )
}

function Profile({ reseller }) {
  const rows = [
    ['Name', reseller.userName || '—'],
    ['Email', reseller.email],
    ['Account ID', <span key="id" className="font-mono text-[13px]">{reseller._id}</span>],
    ['Type', reseller.type === 'manager' ? 'Distributor manager (can recharge resellers; no customers)' : reseller.type === 'sub' ? 'Sub-reseller' : 'Main reseller'],
    [
      'Parent',
      reseller.parent ? (
        <Link key="p" to={`/layout/reseller/${reseller.parent._id}`} className="font-semibold text-brand hover:underline">
          {reseller.parent.userName}
        </Link>
      ) : reseller.type === 'sub' ? (
        'Parent account not found'
      ) : reseller.type === 'manager' ? (
        'None'
      ) : (
        'None (main reseller)'
      ),
    ],
    ['Created', formatDate(reseller.currentDate)],
    ['Status', reseller.block ? 'Blocked — cannot sign in' : 'Active'],
  ]
  return (
    <dl className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="bg-surface px-4 py-3 sm:px-5 sm:[&:last-child:nth-child(odd)]:col-span-2">
          <dt className="text-xs font-medium text-muted">{label}</dt>
          <dd className="mt-0.5 break-words text-sm font-semibold text-fg">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Old URL (/layout/reseller/resellerCustomer/:id) keeps working and lands on the Customers tab. */
export function LegacyResellerCustomerRedirect() {
  const { id } = useParams()
  return <Navigate to={`/layout/reseller/${id}?tab=customers`} replace />
}

export default function ResellerDetail() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const resellers = useResellers()
  const managers = useManagers()
  const customers = useResource(`reseller-subs:${id}`, () => resellersApi.subscriptions(id, 1))
  const [editing, setEditing] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [creditMode, setCreditMode] = useState(null)
  const [roleChange, setRoleChange] = useState(null) // null | true (grant) | false (revoke)

  const reseller = useMemo(
    () => withHierarchy(resellers.data?.allResellers ?? [], managerIdsOf(managers)).find((r) => r._id === id) ?? null,
    [resellers.data, managers, id],
  )

  const isManager = reseller?.type === 'manager'
  // A distributor manager has no customers or credits of its own.
  const tabs = isManager
    ? [{ value: 'profile', label: 'Profile', icon: IdCard }]
    : [
        { value: 'customers', label: 'Customers', icon: Users },
        ...(reseller?.type === 'main' ? [{ value: 'subs', label: 'Sub-resellers', icon: UserPlus }] : []),
        { value: 'credits', label: 'Credit history', icon: History },
        { value: 'profile', label: 'Profile', icon: IdCard },
      ]
  const firstTab = tabs[0].value
  const tab = tabs.some((t) => t.value === params.get('tab')) ? params.get('tab') : firstTab
  const setTab = (value) => setParams(value === firstTab ? {} : { tab: value })
  // Only a main reseller without sub-resellers can become a manager (the API checks the same).
  const canGrant = reseller?.type === 'main' && reseller.children.length === 0

  const back = (
    <Link to="/layout/reseller" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-brand">
      <ArrowLeft size={15} aria-hidden="true" /> Resellers
    </Link>
  )

  if (resellers.loading) {
    return (
      <>
        {back}
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-80" />
        <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </>
    )
  }
  if (resellers.error) {
    return (
      <>
        {back}
        <Card className="py-10"><ErrorState message={resellers.error} onRetry={resellers.reload} /></Card>
      </>
    )
  }
  if (!reseller) {
    return (
      <>
        {back}
        <Card className="py-10">
          <EmptyState title="Reseller not found" description="It may have been removed, or the link is incorrect." action={<Link to="/layout/reseller" className="text-sm font-semibold text-brand hover:underline">Back to resellers</Link>} />
        </Card>
      </>
    )
  }

  const customerTotal = totalOf(customers.data)
  const name = reseller.userName || reseller.email

  return (
    <>
      {back}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-bold tracking-tight text-fg sm:text-[22px]">{name}</h1>
            <TypeBadge reseller={reseller} />
            {reseller.block ? <Badge tone="danger">Blocked</Badge> : <Badge tone="success">Active</Badge>}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
            <span className="truncate">{reseller.email}</span>
            {reseller.parent && (
              <span className="flex items-center gap-1">
                <CornerDownRight size={13} aria-hidden="true" /> under{' '}
                <Link to={`/layout/reseller/${reseller.parent._id}`} className="font-semibold text-brand hover:underline">{reseller.parent.userName}</Link>
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isManager ? (
            <Button variant="secondary" icon={KeyRound} onClick={() => setRoleChange(false)}>Revoke manager role</Button>
          ) : canGrant ? (
            <Button variant="secondary" icon={KeyRound} onClick={() => setRoleChange(true)}>Make distributor manager</Button>
          ) : null}
          <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>
          {reseller.block ? (
            <Button variant="secondary" icon={ShieldCheck} onClick={() => setBlocking(true)}>Unblock</Button>
          ) : (
            <Button variant="danger-ghost" icon={Ban} onClick={() => setBlocking(true)}>Block</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label="Available credits"
          icon={Coins}
          sub={isManager ? 'Not used: managers cannot activate customers' : '1 per 1-year · 2 per lifetime activation'}
          action={
            isManager ? undefined : (
              <>
                <Button size="sm" icon={Plus} onClick={() => setCreditMode('add')}>Add</Button>
                <Button size="sm" variant="secondary" icon={Minus} onClick={() => setCreditMode('remove')}>Remove</Button>
              </>
            )
          }
        >
          {formatNumber(reseller.subscriptionsNum)}
        </Stat>
        <Stat label="Customers" icon={Users} sub="Subscriptions this reseller activated">
          {customers.loading ? (
            <Skeleton className="h-7 w-16" />
          ) : customers.error ? (
            <span className="text-[13px] font-medium text-danger">Unavailable</span>
          ) : (
            formatNumber(customerTotal ?? customers.data?.subscriptions?.length ?? 0)
          )}
        </Stat>
        <Stat label="Sub-resellers" icon={UserPlus} sub={reseller.type === 'sub' ? 'Sub-resellers cannot add their own' : 'Created from the reseller portal'}>
          {reseller.type === 'sub' ? '—' : formatNumber(reseller.children.length)}
        </Stat>
        <Stat label="Created" icon={CalendarDays} sub={reseller.block ? 'Account is blocked' : 'Account is active'}>
          {formatDate(reseller.currentDate)}
        </Stat>
      </div>

      <Card className="mt-5">
        <div className="px-4 pt-1.5 sm:px-5">
          <Tabs label="Reseller sections" tabs={tabs} value={tab} onChange={setTab} />
        </div>
        {tab === 'customers' ? (
          <ResellerCustomer id={id} />
        ) : tab === 'subs' ? (
          <SubResellers reseller={reseller} />
        ) : tab === 'credits' ? (
          <CreditLedger resellerId={id} />
        ) : (
          <Profile reseller={reseller} />
        )}
      </Card>

      <ResellerForm open={editing} reseller={editing ? reseller : null} onClose={() => setEditing(false)} />
      <BlockDialog reseller={blocking ? reseller : null} onClose={() => setBlocking(false)} />
      <CreditsDialog reseller={creditMode ? reseller : null} mode={creditMode} onClose={() => setCreditMode(null)} />
      <ManagerRoleDialog reseller={roleChange === null ? null : reseller} grant={roleChange === true} onClose={() => setRoleChange(null)} />
    </>
  )
}
