import { Card } from '../ui/Card'
import Badge from '../ui/Badge'
import { EmptyState, ErrorState } from '../ui/States'
import { Pagination, SkeletonRows, Table, TableMessage, Td, Th, Tr } from '../ui/Table'
import ListToolbar, { ResultNote } from '../Customers/ListToolbar'
import usePagedList from '../../lib/usePagedList'
import { subscriptionsApi } from '../../lib/services'
import { formatAmount, formatDate, formatDeviceType, subscriptionStatus } from '../../lib/format'

const pick = (data) => ({ items: data?.subscriptions, totalPages: data?.totalPages })

export default function Transaction() {
  const list = usePagedList({
    list: subscriptionsApi.list,
    search: subscriptionsApi.searchByMac,
    pick,
    getType: (item) => item.userId?.type,
  })

  return (
    <Card>
      <ListToolbar list={list} />
      <ResultNote list={list} noun="transaction" />
      <Table caption="Transactions" minWidth={0}>
        <thead>
          <tr>
            <Th>MAC address</Th>
            <Th className="hidden md:table-cell">Device</Th>
            <Th align="right">Pay amount</Th>
            <Th className="hidden lg:table-cell">Payment time</Th>
            <Th className="hidden sm:table-cell">Expiry date</Th>
            <Th className="hidden sm:table-cell">Status</Th>
          </tr>
        </thead>
        <tbody>
          {list.loading ? (
            <SkeletonRows cols={6} />
          ) : list.error ? (
            <TableMessage cols={6}>
              <ErrorState message={list.error} onRetry={list.reload} />
            </TableMessage>
          ) : list.items.length === 0 ? (
            <TableMessage cols={6}>
              <EmptyState
                title={list.searching || list.types.length ? 'No matching transactions' : 'No transactions yet'}
                description={
                  list.searching || list.types.length
                    ? 'Check the MAC address or clear the filters.'
                    : 'Payments appear here once devices are activated.'
                }
              />
            </TableMessage>
          ) : (
            list.items.map((item, i) => {
              const status = subscriptionStatus(item.subscriptionEndDate)
              return (
                <Tr key={item._id ?? i}>
                  <Td>
                    <span className="block font-mono text-[13px] font-semibold">{item.userId?.macAddress ?? '—'}</span>
                    <span className="mt-0.5 block text-xs text-muted md:hidden">
                      {formatDeviceType(item.userId?.type)} · paid {formatDate(item.time)}
                    </span>
                    <span className="mt-1 block sm:hidden">
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </span>
                  </Td>
                  <Td className="hidden text-muted md:table-cell">{formatDeviceType(item.userId?.type)}</Td>
                  <Td align="right" className="font-semibold tabular">{formatAmount(item.cost)}</Td>
                  <Td className="hidden whitespace-nowrap text-muted lg:table-cell">{formatDate(item.time, { withTime: true })}</Td>
                  <Td className="hidden whitespace-nowrap sm:table-cell">{formatDate(item.subscriptionEndDate)}</Td>
                  <Td className="hidden sm:table-cell">
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </Td>
                </Tr>
              )
            })
          )}
        </tbody>
      </Table>
      {!list.searching && (
        <Pagination page={list.page} totalPages={list.totalPages} onChange={list.setPage} disabled={list.loading} />
      )}
    </Card>
  )
}
