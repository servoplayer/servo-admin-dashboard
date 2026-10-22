import { useLocation } from 'react-router-dom'
import { SearchInput } from '../ui/Field'
import { cx } from '../ui/cx'

const DEVICE_TYPES = [
  { value: 'lg', label: 'LG' },
  { value: 'samsung', label: 'Samsung' },
  { value: 'android', label: 'Android' },
]

/** Search + device-type filter shared by the Devices and Transactions tabs. */
export default function ListToolbar({ list, searchLabel = 'Search by MAC address' }) {
  const { state } = useLocation()
  const chip = (active) =>
    cx(
      'h-8 rounded-full px-3 text-[13px] font-semibold transition-colors',
      active ? 'bg-brand text-brand-fg' : 'bg-surface-2 text-muted ring-1 ring-inset ring-line hover:text-fg hover:ring-line-strong',
    )
  return (
    <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
      <SearchInput
        value={list.query}
        onChange={list.setQuery}
        placeholder={searchLabel}
        loading={list.pendingQuery || (list.searching && list.loading)}
        className="w-full lg:max-w-sm"
        autoFocus={Boolean(state?.focusSearch) || Boolean(list.query)}
      />
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by device type">
        <span className="mr-1 text-xs font-medium text-subtle">Device</span>
        <button type="button" className={chip(list.types.length === 0)} aria-pressed={list.types.length === 0} onClick={() => list.toggleType(null)}>
          All
        </button>
        {DEVICE_TYPES.map((t) => {
          const active = list.types.includes(t.value)
          return (
            <button key={t.value} type="button" className={chip(active)} aria-pressed={active} onClick={() => list.toggleType(t.value)}>
              {t.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Explains what the visible rows are, so client-side filtering is never mistaken for a global filter. */
export function ResultNote({ list, noun }) {
  if (list.loading || list.error) return null
  const parts = []
  if (list.searching) parts.push(`${list.loadedCount} ${noun}${list.loadedCount === 1 ? '' : 's'} match “${list.query.trim()}”`)
  if (list.types.length) parts.push(`device filter applied to ${list.searching ? 'the results' : 'this page'}: showing ${list.items.length} of ${list.loadedCount}`)
  if (!parts.length) return null
  return <p className="border-b border-line bg-surface-2/60 px-4 py-2 text-xs text-muted sm:px-5">{parts.join(' · ')}</p>
}
