import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Badge from '../ui/Badge'
import { SearchInput } from '../ui/Field'
import { EmptyState, ErrorState } from '../ui/States'
import { Pagination, SkeletonRows, Table, TableMessage, Td, Th, Tr } from '../ui/Table'
import { resellersApi } from '../../lib/services'
import { formatDate, isLifetime, normalizeMac } from '../../lib/format'

function statusOf(isActive) {
  if (isActive === true) return { tone: 'success', label: 'Active' }
  if (isActive === false) return { tone: 'neutral', label: 'Not active' }
  return { tone: 'warning', label: 'Postponed' }
}

/** Subscriptions activated by one reseller (paged by the `?page=` URL param). */
export default function ResellerCustomer({ id }) {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const [data, setData] = useState({ items: [], totalPages: 0, loading: true, error: '' })
  const [version, setVersion] = useState(0)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setData((d) => ({ ...d, loading: true, error: '' }))
    resellersApi.subscriptions(id, page, { signal: controller.signal }).then((res) => {
      if (res.aborted) return
      if (!res.ok) setData({ items: [], totalPages: 0, loading: false, error: res.message })
      else setData({ items: res.data?.subscriptions ?? [], totalPages: Number(res.data?.totalPages) || 0, loading: false, error: '' })
    })
    return () => controller.abort()
  }, [id, page, version])

  const needle = normalizeMac(filter)
  const rows = needle ? data.items.filter((item) => normalizeMac(item.userId?.macAddress).includes(needle)) : data.items

  const setPage = (p) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (p === 1) next.delete('page')
      else next.set('page', p)
      return next
    })

  return (
    <>
      <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <SearchInput value={filter} onChange={setFilter} placeholder="Filter this page by MAC address" className="w-full sm:max-w-sm" />
        {needle && !data.loading && (
          <p className="text-xs text-muted">Showing {rows.length} of {data.items.length} on this page</p>
        )}
      </div>
      <Table caption="Reseller customers" minWidth={0}>
        <thead>
          <tr>
            <Th>MAC address</Th>
            <Th className="hidden sm:table-cell">Package</Th>
            <Th className="hidden md:table-cell">Activated</Th>
            <Th className="hidden sm:table-cell">Expiry date</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {data.loading ? (
            <SkeletonRows cols={5} />
          ) : data.error ? (
            <TableMessage cols={5}>
              <ErrorState message={data.error} onRetry={() => setVersion((v) => v + 1)} />
            </TableMessage>
          ) : rows.length === 0 ? (
            <TableMessage cols={5}>
              <EmptyState
                title={needle ? 'No matching customers on this page' : 'No subscriptions found yet'}
                description={needle ? 'Clear the filter or check another page.' : 'Customers activated by this reseller will appear here.'}
              />
            </TableMessage>
          ) : (
            rows.map((item, i) => {
              const status = statusOf(item.isActive)
              const lifetime = isLifetime(item.subscriptionEndDate)
              return (
                <Tr key={item._id ?? i}>
                  <Td>
                    <span className="block font-mono text-[13px] font-semibold">{item.userId?.macAddress ?? '—'}</span>
                    <span className="mt-0.5 block text-xs text-muted sm:hidden">
                      {lifetime ? 'Lifetime' : `Expires ${formatDate(item.subscriptionEndDate)}`}
                    </span>
                  </Td>
                  <Td className="hidden capitalize text-muted sm:table-cell">{lifetime ? 'Lifetime' : item.subscriptionType ?? 'Yearly'}</Td>
                  <Td className="hidden whitespace-nowrap text-muted md:table-cell">{formatDate(item.subscriptionStartDate)}</Td>
                  <Td className="hidden whitespace-nowrap sm:table-cell">{lifetime ? 'Never' : formatDate(item.subscriptionEndDate)}</Td>
                  <Td>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </Td>
                </Tr>
              )
            })
          )}
        </tbody>
      </Table>
      <Pagination page={page} totalPages={data.totalPages} onChange={setPage} disabled={data.loading} />
    </>
  )
}
