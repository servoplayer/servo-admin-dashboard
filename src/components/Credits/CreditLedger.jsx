import { useSearchParams } from 'react-router-dom'
import { History } from 'lucide-react'
import Badge from '../ui/Badge'
import { EmptyState, ErrorState } from '../ui/States'
import { Pagination, SkeletonRows, Table, TableMessage, Td, Th, Tr } from '../ui/Table'
import { cx } from '../ui/cx'
import { useResource } from '../../lib/resource'
import { creditsApi } from '../../lib/services'
import { formatDate, formatNumber } from '../../lib/format'

const STATUS = {
  succeeded: { tone: 'success', label: 'Completed' },
  failed: { tone: 'danger', label: 'Failed' },
  pending: { tone: 'warning', label: 'Processing' },
}

const actorLabel = (role) => (role === 'Admin' ? 'Administrator' : role === 'distributorManager' ? 'Distributor manager' : '—')

/** Audited credit changes, newest first. Pass `resellerId` to show one reseller only. */
export default function CreditLedger({ resellerId }) {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const history = useResource(`credit-tx:${resellerId ?? 'all'}:${page}`, () => creditsApi.transactions(page, resellerId))
  const rows = history.data?.transactions ?? []
  const cols = resellerId ? 6 : 7

  const setPage = (p) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (p === 1) next.delete('page')
      else next.set('page', p)
      return next
    })

  return (
    <>
      <Table caption="Credit history" minWidth={0}>
        <thead>
          <tr>
            <Th>Date</Th>
            {!resellerId && <Th>Reseller</Th>}
            <Th align="right">Change</Th>
            <Th align="right" className="hidden sm:table-cell">Balance after</Th>
            <Th className="hidden md:table-cell">By</Th>
            <Th className="hidden lg:table-cell">Reference</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {history.loading ? (
            <SkeletonRows cols={cols} />
          ) : history.error ? (
            <TableMessage cols={cols}>
              <ErrorState message={history.error} onRetry={history.reload} />
            </TableMessage>
          ) : rows.length === 0 ? (
            <TableMessage cols={cols}>
              <EmptyState
                icon={History}
                title="No credit changes recorded yet"
                description="Credits added or removed from now on are listed here. Balance edits made before this history existed are not."
              />
            </TableMessage>
          ) : (
            rows.map((tx) => {
              const status = STATUS[tx.status] ?? STATUS.pending
              const done = tx.status === 'succeeded'
              return (
                <Tr key={tx._id}>
                  <Td className="whitespace-nowrap">
                    <span className="block text-[13px]">{formatDate(tx.createdAt, { withTime: true })}</span>
                    {tx.note && resellerId && <span className="block max-w-[260px] truncate text-xs text-muted" title={tx.note}>{tx.note}</span>}
                  </Td>
                  {!resellerId && (
                    <Td>
                      <span className="block truncate font-semibold">{tx.resellerName ?? '—'}</span>
                      {tx.note && <span className="block max-w-[260px] truncate text-xs text-muted" title={tx.note}>{tx.note}</span>}
                    </Td>
                  )}
                  <Td
                    align="right"
                    className={cx('font-bold tabular', !done ? 'text-muted line-through' : tx.type === 'deduction' ? 'text-danger' : 'text-success')}
                  >
                    {tx.type === 'deduction' ? '−' : '+'}{formatNumber(tx.amount)}
                  </Td>
                  <Td align="right" className="hidden tabular sm:table-cell">{done ? formatNumber(tx.balanceAfter) : '—'}</Td>
                  <Td className="hidden md:table-cell">
                    <span className="block text-[13px]">{tx.actorName ?? '—'}</span>
                    <span className="block text-xs text-muted">{actorLabel(tx.actorRole)}</span>
                  </Td>
                  <Td className="hidden font-mono text-xs text-muted lg:table-cell">{tx.reference}</Td>
                  <Td>
                    <Badge tone={status.tone}>{status.label}</Badge>
                    {tx.error && <span className="mt-0.5 block text-xs text-muted">{tx.error}</span>}
                  </Td>
                </Tr>
              )
            })
          )}
        </tbody>
      </Table>
      <Pagination page={page} totalPages={Number(history.data?.totalPages) || 0} onChange={setPage} disabled={history.loading} />
    </>
  )
}
