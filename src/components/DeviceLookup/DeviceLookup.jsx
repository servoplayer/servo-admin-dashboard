import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarClock, Check, Copy, ListVideo, MonitorSmartphone, Power, ScanSearch, Search, Zap } from 'lucide-react'
import { Card, CardHeader, PageHeader } from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { Input } from '../ui/Field'
import { EmptyState, ErrorState, Skeleton } from '../ui/States'
import { Table, Td, Th, Tr } from '../ui/Table'
import useDeviceActions from '../Devices/useDeviceActions'
import { devicesApi } from '../../lib/services'
import { useResource } from '../../lib/resource'
import { formatDate, formatDeviceType, isLifetime, normalizeMac, relativeDays, subscriptionStatus } from '../../lib/format'

// `/user/search` answers 404 with this message when nothing matches.
const NOT_FOUND = /no device found/i

function deviceState(d) {
  if (d.isSubscribed) return subscriptionStatus(d.endDate)
  if (d.isTrialActive) return { tone: 'info', label: 'Trial' }
  return { tone: 'neutral', label: 'Inactive' }
}

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard can be blocked; the value stays visible and selectable.
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-subtle hover:bg-surface-2 hover:text-fg"
      aria-label={copied ? 'Copied' : label}
      title={copied ? 'Copied' : label}
    >
      {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
    </button>
  )
}

function DeviceCard({ device, onAction }) {
  const status = deviceState(device)
  const lifetime = isLifetime(device.endDate)
  const facts = [
    ['Platform', formatDeviceType(device.type)],
    ['Status', <Badge key="s" tone={status.tone}>{status.label}</Badge>],
    [
      'Subscription ends',
      device.isSubscribed && device.endDate
        ? lifetime
          ? 'Lifetime'
          : `${formatDate(device.endDate)} · ${relativeDays(device.endDate)}`
        : '—',
    ],
    ['Trial', device.isTrialActive ? 'Active' : 'Not active'],
  ]
  const playlists = device.playlists ?? []

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-4 sm:px-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <MonitorSmartphone size={19} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted">MAC address</p>
            <div className="flex items-center gap-1">
              <p className="truncate font-mono text-base font-bold text-fg">{device.macAddress}</p>
              <CopyButton value={device.macAddress} label="Copy MAC address" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {device.isSubscribed ? (
              <Button size="sm" variant="danger-ghost" icon={Power} onClick={() => onAction('deactivate', device)}>Stop</Button>
            ) : (
              <Button size="sm" icon={Zap} onClick={() => onAction('activate', device)}>Activate</Button>
            )}
            <Button size="sm" variant="secondary" icon={CalendarClock} onClick={() => onAction('renew', device)}>Renew</Button>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {facts.map(([label, value]) => (
            <div key={label} className="bg-surface px-4 py-3 sm:px-5">
              <dt className="text-xs font-medium text-muted">{label}</dt>
              <dd className="mt-1 text-sm font-semibold text-fg">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <CardHeader icon={ListVideo} title="Active playlist" description="The playlist the app currently loads." />
        <div className="px-4 py-4 sm:px-5">
          {playlists.length === 0 ? (
            <p className="text-[13px] text-muted">No active playlist on this device.</p>
          ) : (
            <ul className="space-y-2">
              {playlists.map((p, i) => (
                <li key={p._id ?? i} className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-fg" title={p.url}>{p.url}</span>
                  <CopyButton value={p.url} label="Copy playlist URL" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  )
}

export default function DeviceLookup() {
  const [params, setParams] = useSearchParams()
  const mac = (params.get('mac') ?? '').trim()
  const [value, setValue] = useState(mac)
  useEffect(() => setValue(mac), [mac])

  const result = useResource(mac ? `lookup:${normalizeMac(mac)}` : 'lookup:none', () =>
    mac ? devicesApi.searchByMac(mac) : Promise.resolve({ ok: true, status: 200, data: null, message: '' }),
  )
  const { open, dialogs } = useDeviceActions(result.reload)

  const notFound = result.status === 404 && NOT_FOUND.test(result.error)
  const matches = result.data?.users ?? []
  const exact = matches.find((d) => normalizeMac(d.macAddress) === normalizeMac(mac))
  const device = exact ?? (matches.length === 1 ? matches[0] : null)

  const submit = (e) => {
    e.preventDefault()
    const q = value.trim()
    setParams(q ? { mac: q } : {})
  }

  return (
    <>
      <PageHeader title="Device lookup" description="Check a device's subscription, trial and playlist by MAC address, then act on it." />

      <Card className="mb-5 p-3 sm:p-4">
        <form onSubmit={submit} role="search" className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <ScanSearch size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" aria-hidden="true" />
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="MAC address, e.g. 00:1A:2B:3C:4D:5E"
              aria-label="MAC address"
              autoFocus={!mac}
              className="pl-10 font-mono"
            />
          </div>
          <Button type="submit" icon={Search} loading={Boolean(mac) && result.loading}>Look up</Button>
        </form>
      </Card>

      {!mac ? (
        <Card className="py-12">
          <EmptyState
            icon={ScanSearch}
            title="Look up any device"
            description="Enter the full MAC address shown in the Servo app, or part of it to list matching devices."
          />
        </Card>
      ) : result.loading ? (
        <Card className="p-5">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="mt-4 h-16 w-full" />
        </Card>
      ) : notFound ? (
        <Card className="py-12">
          <EmptyState title="No device found" description={`Nothing matches “${mac}”. Check the MAC address on the TV and try again.`} />
        </Card>
      ) : result.error ? (
        <Card className="py-10">
          <ErrorState message={result.error} onRetry={result.reload} />
        </Card>
      ) : device ? (
        <DeviceCard device={device} onAction={open} />
      ) : (
        <Card>
          <CardHeader
            title={`${matches.length} matching device${matches.length === 1 ? '' : 's'}`}
            description="Showing up to 20 of the newest matches. Choose one, or enter the full MAC address."
          />
          <Table caption="Matching devices" minWidth={0}>
            <thead>
              <tr>
                <Th>MAC address</Th>
                <Th className="hidden sm:table-cell">Platform</Th>
                <Th>Status</Th>
                <Th align="right"><span className="sr-only">View</span></Th>
              </tr>
            </thead>
            <tbody>
              {matches.map((d) => {
                const status = deviceState(d)
                return (
                  <Tr key={d._id}>
                    <Td className="font-mono text-[13px] font-semibold">{d.macAddress}</Td>
                    <Td className="hidden text-muted sm:table-cell">{formatDeviceType(d.type)}</Td>
                    <Td><Badge tone={status.tone}>{status.label}</Badge></Td>
                    <Td align="right">
                      <Button size="sm" variant="secondary" onClick={() => setParams({ mac: d.macAddress })}>View</Button>
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        </Card>
      )}
      {dialogs}
    </>
  )
}
