import { useState } from 'react'
import { BarChart3, MonitorSmartphone, ServerCog } from 'lucide-react'
import { Card, CardHeader } from '../ui/Card'
import { EmptyState, ErrorState, Skeleton } from '../ui/States'
import { ColumnChart, RankedBars, StatusBreakdown } from '../ui/Charts'
import { monthLabel } from '../../lib/chartScale'
import { cx } from '../ui/cx'
import { useStats } from '../../lib/dashboardData'
import { formatAmount, formatDeviceType, formatNumber } from '../../lib/format'

const MEASURES = [
  { value: 'count', label: 'Activations', unit: 'activations' },
  { value: 'revenue', label: 'Revenue', unit: 'paid' },
]

/** Shown instead of a chart when the stats endpoint is not available on the server yet. */
function StatsUnavailable({ stats }) {
  if (stats.status === 404) {
    return (
      <EmptyState
        icon={ServerCog}
        title="Charts need a server update"
        description="Deploy the latest Servo backend (GET /admin/stats) to see activity charts. Everything else keeps working."
        className="py-8"
      />
    )
  }
  return <ErrorState message={stats.error} onRetry={stats.reload} className="py-8" />
}

function Segmented({ value, onChange, options, label }) {
  return (
    <div className="flex rounded-lg bg-surface-2 p-0.5 ring-1 ring-inset ring-line" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'h-7 rounded-md px-2.5 text-xs font-semibold transition-colors',
            value === o.value ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function OverviewCharts() {
  const stats = useStats()
  const [measure, setMeasure] = useState('count')
  const m = MEASURES.find((x) => x.value === measure)
  const monthly = stats.data?.subscriptions?.monthly ?? []
  const devices = stats.data?.devices
  const format = measure === 'revenue' ? formatAmount : formatNumber

  const columns = monthly.map((row) => {
    const label = monthLabel(row.month)
    return {
      key: row.month,
      label: label.long,
      short: label.short,
      value: Number(row[measure]) || 0,
      detail: measure === 'count' && row.lifetime ? `${formatNumber(row.lifetime)} lifetime` : undefined,
    }
  })
  const periodTotal = columns.reduce((acc, c) => acc + c.value, 0)

  return (
    <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader
          icon={BarChart3}
          title={`${m.label} per month`}
          description="Subscriptions started in the last 6 months, by start date. Includes reseller and provider-code activations."
          actions={<Segmented value={measure} onChange={setMeasure} options={MEASURES} label="Chart measure" />}
        />
        <div className="p-4 sm:p-5">
          {stats.loading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : stats.error ? (
            <StatsUnavailable stats={stats} />
          ) : (
            <>
              <p className="mb-4 text-[13px] text-muted">
                <span className="text-lg font-bold text-fg tabular">{format(periodTotal)}</span>{' '}
                {measure === 'revenue' ? 'paid in this period' : 'activations in this period'}
                {measure === 'count' && stats.data?.subscriptions?.total !== undefined && (
                  <> · {formatNumber(stats.data.subscriptions.total)} all time</>
                )}
              </p>
              <ColumnChart height={240} data={columns} unit={m.unit} format={format} caption={`${m.label} per month`} />
            </>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader icon={MonitorSmartphone} title="Device status" description="All registered devices, as of today." />
        <div className="p-4 sm:p-5">
          {stats.loading ? (
            <div className="space-y-3">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : stats.error ? (
            <StatsUnavailable stats={stats} />
          ) : !devices?.total ? (
            <EmptyState title="No devices yet" description="Devices appear after customers open the Servo app." className="py-6" />
          ) : (
            <>
              <StatusBreakdown
                total={devices.total}
                items={[
                  { key: 'active', label: 'Active', hint: 'Subscribed, end date not reached', value: devices.active, tone: 'success' },
                  { key: 'expired', label: 'Past end date', hint: 'Still flagged as subscribed', value: devices.expired, tone: 'danger' },
                  { key: 'trial', label: 'Trial', value: devices.trial, tone: 'info' },
                  { key: 'inactive', label: 'Inactive', value: devices.inactive, tone: 'neutral' },
                ]}
              />
              {devices.byType?.length > 0 && (
                <div className="mt-5 border-t border-line pt-4">
                  <p className="mb-3 text-2xs font-semibold uppercase tracking-wider text-muted">By platform</p>
                  <RankedBars
                    items={devices.byType.map((t) => ({
                      key: t.type,
                      label: t.type === 'unknown' ? 'Not reported' : formatDeviceType(t.type),
                      value: t.count,
                    }))}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
