import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ban, ChevronRight, CornerDownRight, Pencil, Plus, ShieldCheck, Users } from 'lucide-react'
import { Card, PageHeader } from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { SearchInput } from '../ui/Field'
import { EmptyState, ErrorState } from '../ui/States'
import { SkeletonRows, SortTh, Table, TableMessage, Td, Th, Tr } from '../ui/Table'
import { cx } from '../ui/cx'
import { BlockDialog, ResellerForm } from './ResellerDialogs'
import { managerIdsOf, useManagers, useResellers } from '../../lib/dashboardData'
import { filterResellers, sortResellers, withHierarchy } from '../../lib/resellers'
import { formatDate, formatNumber } from '../../lib/format'

const TYPE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'main', label: 'Main' },
  { value: 'sub', label: 'Sub-resellers' },
  { value: 'manager', label: 'Managers' },
]
const STATUS_FILTERS = [
  { value: 'all', label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'blocked', label: 'Blocked' },
]

function Chips({ label, options, value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'h-8 rounded-full px-3 text-[13px] font-semibold transition-colors',
            value === o.value ? 'bg-brand text-brand-fg' : 'bg-surface-2 text-muted ring-1 ring-inset ring-line hover:text-fg hover:ring-line-strong',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function TypeBadge({ reseller }) {
  if (reseller.type === 'manager') return <Badge tone="warning" dot={false}>Distributor manager</Badge>
  return reseller.type === 'sub' ? (
    <Badge tone="info" dot={false}>Sub-reseller</Badge>
  ) : (
    <Badge tone="brand" dot={false}>Main</Badge>
  )
}

export default function Reseller() {
  const [params, setParams] = useSearchParams()
  const resellers = useResellers()
  const managers = useManagers()
  const [search, setSearch] = useState('')
  const [formFor, setFormFor] = useState(null) // null = closed, {} = new, reseller = edit
  const [blockTarget, setBlockTarget] = useState(null)
  const type = params.get('type') ?? 'all'
  const status = params.get('status') ?? 'all'
  const [sort, setSort] = useState(null)

  // Deep link from quick actions: /layout/reseller?new=1
  useEffect(() => {
    if (params.get('new') === '1') {
      setFormFor({})
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('new')
        return next
      }, { replace: true })
    }
  }, [params, setParams])

  // Filters live in the URL so they survive refreshes and back/forward.
  const setFilter = (key) => (value) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value === 'all') next.delete(key)
      else next.set(key, value)
      return next
    }, { replace: true })

  const all = useMemo(
    () => withHierarchy(resellers.data?.allResellers ?? [], managerIdsOf(managers)),
    [resellers.data, managers],
  )
  const filtered = filterResellers(all, { q: search, type, status })
  const rows = sort ? sortResellers(filtered, sort.key, sort.dir) : filtered
  const subCount = all.filter((r) => r.type === 'sub').length
  const managerCount = all.filter((r) => r.type === 'manager').length
  const filtering = Boolean(search.trim()) || type !== 'all' || status !== 'all'

  return (
    <>
      <PageHeader
        title="Resellers"
        description={
          resellers.loading || resellers.error
            ? 'Partner accounts that activate Servo for their own customers.'
            : `${formatNumber(all.length - subCount - managerCount)} main resellers · ${formatNumber(subCount)} sub-resellers${managerCount ? ` · ${formatNumber(managerCount)} distributor manager${managerCount > 1 ? 's' : ''}` : ''}`
        }
        actions={<Button icon={Plus} onClick={() => setFormFor({})}>New reseller</Button>}
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:px-5 xl:flex-row xl:items-center xl:justify-between">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, email or parent" className="w-full xl:max-w-sm" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Chips label="Filter by type" options={TYPE_FILTERS} value={type} onChange={setFilter('type')} />
            <span className="hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
            <Chips label="Filter by status" options={STATUS_FILTERS} value={status} onChange={setFilter('status')} />
          </div>
        </div>
        {filtering && !resellers.loading && !resellers.error && (
          <p className="border-b border-line bg-surface-2/60 px-4 py-2 text-xs text-muted tabular sm:px-5">
            Showing {formatNumber(rows.length)} of {formatNumber(all.length)} resellers
          </p>
        )}
        <Table caption="Resellers" minWidth={0}>
          <thead>
            <tr>
              <SortTh sortKey="name" sort={sort} onSort={setSort}>Reseller</SortTh>
              <Th className="hidden md:table-cell">Type</Th>
              <SortTh sortKey="credits" sort={sort} onSort={setSort} align="right" className="hidden sm:table-cell">Credits</SortTh>
              <SortTh sortKey="created" sort={sort} onSort={setSort} className="hidden lg:table-cell">Created</SortTh>
              <Th className="hidden sm:table-cell">Status</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {resellers.loading ? (
              <SkeletonRows cols={6} />
            ) : resellers.error ? (
              <TableMessage cols={6}>
                <ErrorState message={resellers.error} onRetry={resellers.reload} />
              </TableMessage>
            ) : rows.length === 0 ? (
              <TableMessage cols={6}>
                {filtering ? (
                  <EmptyState title="No matching resellers" description="Try a different search or clear the filters." />
                ) : (
                  <EmptyState
                    icon={Users}
                    title="No resellers yet"
                    description="Create a reseller account to let partners activate customers."
                    action={<Button size="sm" icon={Plus} onClick={() => setFormFor({})}>New reseller</Button>}
                  />
                )}
              </TableMessage>
            ) : (
              rows.map((item) => (
                <Tr key={item._id}>
                  <Td>
                    <Link to={`/layout/reseller/${item._id}`} className="group flex items-center gap-3 rounded-lg">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-bold uppercase text-brand">
                        {(item.userName || item.email || '?').charAt(0)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold group-hover:text-brand group-hover:underline">{item.userName || item.email}</span>
                        <span className="block truncate text-xs text-muted">{item.email}</span>
                        {item.parent && (
                          <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted md:hidden">
                            <CornerDownRight size={12} aria-hidden="true" /> under {item.parent.userName}
                          </span>
                        )}
                        <span className="mt-1 flex items-center gap-2 text-xs text-muted sm:hidden">
                          {item.block ? <Badge tone="danger">Blocked</Badge> : <Badge tone="success">Active</Badge>}
                          {formatNumber(item.subscriptionsNum)} credits
                        </span>
                      </span>
                    </Link>
                  </Td>
                  <Td className="hidden md:table-cell">
                    <TypeBadge reseller={item} />
                    {item.type === 'sub' && (
                      <span className="mt-1 flex items-center gap-1 text-xs text-muted">
                        <CornerDownRight size={12} aria-hidden="true" />
                        {item.parent ? (
                          <Link to={`/layout/reseller/${item.parent._id}`} className="truncate hover:text-brand hover:underline">{item.parent.userName}</Link>
                        ) : (
                          'Parent not found'
                        )}
                      </span>
                    )}
                    {item.type === 'main' && item.children.length > 0 && (
                      <span className="mt-1 block text-xs text-muted">{item.children.length} sub-reseller{item.children.length > 1 ? 's' : ''}</span>
                    )}
                  </Td>
                  <Td align="right" className="hidden font-semibold tabular sm:table-cell">{formatNumber(item.subscriptionsNum)}</Td>
                  <Td className="hidden whitespace-nowrap text-muted lg:table-cell">{formatDate(item.currentDate)}</Td>
                  <Td className="hidden sm:table-cell">
                    {item.block ? <Badge tone="danger">Blocked</Badge> : <Badge tone="success">Active</Badge>}
                  </Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon-sm" variant="ghost" onClick={() => setFormFor(item)} aria-label={`Edit ${item.userName}`} title="Edit">
                        <Pencil size={15} />
                      </Button>
                      {item.block ? (
                        <Button size="icon-sm" variant="ghost" onClick={() => setBlockTarget(item)} aria-label={`Unblock ${item.userName}`} title="Unblock">
                          <ShieldCheck size={15} />
                        </Button>
                      ) : (
                        <Button size="icon-sm" variant="danger-ghost" onClick={() => setBlockTarget(item)} aria-label={`Block ${item.userName}`} title="Block">
                          <Ban size={15} />
                        </Button>
                      )}
                      <Link
                        to={`/layout/reseller/${item._id}`}
                        className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-brand hover:bg-brand-soft"
                        aria-label={`Open ${item.userName}`}
                      >
                        <span className="max-sm:sr-only">Open</span> <ChevronRight size={15} aria-hidden="true" />
                      </Link>
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      <ResellerForm
        open={formFor !== null}
        reseller={formFor && formFor._id ? formFor : null}
        onClose={() => setFormFor(null)}
      />
      <BlockDialog reseller={blockTarget} onClose={() => setBlockTarget(null)} />
    </>
  )
}
