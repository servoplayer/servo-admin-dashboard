import { useState } from 'react'
import { CalendarClock, Check, Copy, Power, Zap } from 'lucide-react'
import { Card } from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { EmptyState, ErrorState } from '../ui/States'
import { Pagination, SkeletonRows, Table, TableMessage, Td, Th, Tr } from '../ui/Table'
import ListToolbar, { ResultNote } from '../Customers/ListToolbar'
import useDeviceActions from '../Devices/useDeviceActions'
import usePagedList from '../../lib/usePagedList'
import { devicesApi } from '../../lib/services'
import { formatDate, formatDeviceType, relativeDays, subscriptionStatus } from '../../lib/format'

const pick = (data) => ({ items: data?.users, totalPages: data?.totalPages })

function PlaylistUrl({ url }) {
  const [copied, setCopied] = useState(false)
  if (!url) return <span className="text-subtle">—</span>
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard can be blocked; the URL is still visible in the tooltip.
    }
  }
  return (
    <div className="flex max-w-[260px] items-center gap-1.5 xl:max-w-[360px]">
      <span className="truncate text-[13px] text-muted" title={url}>{url}</span>
      <button
        type="button"
        onClick={copy}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-subtle hover:bg-surface-2 hover:text-fg"
        aria-label={copied ? 'Copied' : 'Copy playlist URL'}
        title={copied ? 'Copied' : 'Copy URL'}
      >
        {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
      </button>
    </div>
  )
}

/** Devices tab of the Customers page (kept under its original component name). */
export default function Playlists() {
  const list = usePagedList({
    list: devicesApi.list,
    search: devicesApi.searchByMac,
    pick,
    getType: (item) => item.type,
  })
  const { open, dialogs } = useDeviceActions(list.reload)

  return (
    <Card>
      <ListToolbar list={list} />
      <ResultNote list={list} noun="device" />
      <Table caption="Devices" minWidth={0}>
        <thead>
          <tr>
            <Th>MAC address</Th>
            <Th className="hidden md:table-cell">Device</Th>
            <Th className="hidden sm:table-cell">Status</Th>
            <Th className="hidden sm:table-cell">Expires</Th>
            <Th className="hidden xl:table-cell">Playlist URL</Th>
            <Th align="right">Actions</Th>
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
                title={list.searching || list.types.length ? 'No matching devices' : 'No devices yet'}
                description={
                  list.searching || list.types.length
                    ? 'Check the MAC address or clear the filters.'
                    : 'Devices appear here after customers open the Servo app.'
                }
              />
            </TableMessage>
          ) : (
            list.items.map((item, i) => {
              const status = item.isSubscribed ? subscriptionStatus(item.endDate) : { tone: 'neutral', label: 'Inactive' }
              return (
                <Tr key={item._id ?? i}>
                  <Td>
                    <span className="block font-mono text-[13px] font-semibold">{item.macAddress}</span>
                    {/* Device and status collapse under the MAC address on small screens. */}
                    <span className="mt-1 flex items-center gap-2 text-xs text-muted sm:hidden">
                      {formatDeviceType(item.type)} <Badge tone={status.tone}>{status.label}</Badge>
                    </span>
                    {item.isSubscribed && item.endDate && (
                      <span className="mt-1 block text-xs text-muted sm:hidden">
                        Expires {formatDate(item.endDate)} · {relativeDays(item.endDate)}
                      </span>
                    )}
                    <span className="mt-0.5 hidden text-xs text-muted sm:block md:hidden">{formatDeviceType(item.type)}</span>
                  </Td>
                  <Td className="hidden text-muted md:table-cell">{formatDeviceType(item.type)}</Td>
                  <Td className="hidden sm:table-cell">
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </Td>
                  <Td className="hidden whitespace-nowrap sm:table-cell">
                    {item.isSubscribed && item.endDate ? (
                      <>
                        <span className="block text-[13px]">{formatDate(item.endDate)}</span>
                        <span className="block text-xs text-muted">{relativeDays(item.endDate)}</span>
                      </>
                    ) : (
                      <span className="text-subtle">—</span>
                    )}
                  </Td>
                  <Td className="hidden xl:table-cell">
                    <PlaylistUrl url={item.playlists?.[0]?.url} />
                  </Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-1.5">
                      {item.isSubscribed ? (
                        <Button size="sm" variant="danger-ghost" icon={Power} onClick={() => open('deactivate', item)} aria-label={`Stop subscription for ${item.macAddress}`}>
                          <span className="max-sm:sr-only">Stop</span>
                        </Button>
                      ) : (
                        <Button size="sm" icon={Zap} onClick={() => open('activate', item)} aria-label={`Activate ${item.macAddress}`}>
                          <span className="max-sm:sr-only">Activate</span>
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" icon={CalendarClock} onClick={() => open('renew', item)} aria-label={`Renew ${item.macAddress}`}>
                        <span className="max-sm:sr-only">Renew</span>
                      </Button>
                    </div>
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
      {dialogs}
    </Card>
  )
}
