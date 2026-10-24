import { useSearchParams } from 'react-router-dom'
import { Activity, History } from 'lucide-react'
import { Card, PageHeader } from '../ui/Card'
import Badge from '../ui/Badge'
import Tabs from '../ui/Tabs'
import { EmptyState, ErrorState } from '../ui/States'
import { Pagination, SkeletonRows, Table, TableMessage, Td, Th, Tr } from '../ui/Table'
import CreditLedger from './CreditLedger'
import { useResellers } from '../../lib/dashboardData'
import { useResource } from '../../lib/resource'
import { creditsApi } from '../../lib/services'
import { formatDate, formatNumber } from '../../lib/format'

const TABS = [
  { value: 'ledger', label: 'Credit history', icon: History },
  { value: 'activity', label: 'Activity log', icon: Activity },
]

const ACTIONS = {
  'credits.recharge': 'Added credits',
  'credits.deduction': 'Removed credits',
  'role.grant': 'Granted distributor manager',
  'role.revoke': 'Revoked distributor manager',
}
const RESULT = {
  succeeded: { tone: 'success', label: 'Succeeded' },
  rejected: { tone: 'warning', label: 'Rejected' },
  failed: { tone: 'danger', label: 'Failed' },
}

/** Credit and role changes, including rejected attempts (GET /admin/auditLog). */
function ActivityLog() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const log = useResource(`credit-tx:audit:${page}`, () => creditsApi.auditLog(page))
  const resellers = useResellers()
  const names = new Map((resellers.data?.allResellers ?? []).map((r) => [r._id, r.userName || r.email]))
  const rows = log.data?.entries ?? []

  return (
    <>
      <Table caption="Activity log" minWidth={0}>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Action</Th>
            <Th className="hidden sm:table-cell">Account</Th>
            <Th className="hidden md:table-cell">By</Th>
            <Th>Result</Th>
          </tr>
        </thead>
        <tbody>
          {log.loading ? (
            <SkeletonRows cols={5} />
          ) : log.error ? (
            <TableMessage cols={5}>
              <ErrorState message={log.error} onRetry={log.reload} />
            </TableMessage>
          ) : rows.length === 0 ? (
            <TableMessage cols={5}>
              <EmptyState icon={Activity} title="No activity recorded yet" description="Credit changes and role changes appear here, including refused attempts." />
            </TableMessage>
          ) : (
            rows.map((e) => {
              const result = RESULT[e.result] ?? RESULT.failed
              // Admin accounts are not in the reseller list, so only their role is shown.
              const actor = names.get(e.actorId)
              const role = e.actorRole === 'Admin' ? 'Administrator' : e.actorRole === 'distributorManager' ? 'Distributor manager' : e.actorRole
              return (
                <Tr key={e._id}>
                  <Td className="whitespace-nowrap text-[13px]">{formatDate(e.createdAt, { withTime: true })}</Td>
                  <Td>
                    <span className="block font-semibold">{ACTIONS[e.action] ?? e.action}</span>
                    {e.details?.amount !== undefined && <span className="block text-xs text-muted tabular">{formatNumber(e.details.amount)} credits{e.details.reference ? ` · ${e.details.reference}` : ''}</span>}
                    {e.details?.message && <span className="block text-xs text-muted">{e.details.message}</span>}
                  </Td>
                  <Td className="hidden sm:table-cell">{e.targetId ? names.get(e.targetId) ?? '—' : '—'}</Td>
                  <Td className="hidden md:table-cell">
                    <span className="block text-[13px]">{actor ?? role}</span>
                    {actor && <span className="block text-xs text-muted">{role}</span>}
                  </Td>
                  <Td><Badge tone={result.tone}>{result.label}</Badge></Td>
                </Tr>
              )
            })
          )}
        </tbody>
      </Table>
      <Pagination
        page={page}
        totalPages={Number(log.data?.totalPages) || 0}
        onChange={(p) => setParams((prev) => { const n = new URLSearchParams(prev); if (p === 1) n.delete('page'); else n.set('page', p); return n })}
        disabled={log.loading}
      />
    </>
  )
}

export default function Credits() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'activity' ? 'activity' : 'ledger'
  return (
    <>
      <PageHeader
        title="Credit history"
        description="Every audited credit change made by administrators and distributor managers, and the activity log of credit and role changes."
      />
      <Card>
        <div className="px-4 pt-1.5 sm:px-5">
          <Tabs label="Credit views" tabs={TABS} value={tab} onChange={(v) => setParams(v === 'ledger' ? {} : { tab: v })} />
        </div>
        {tab === 'ledger' ? <CreditLedger /> : <ActivityLog />}
      </Card>
    </>
  )
}
