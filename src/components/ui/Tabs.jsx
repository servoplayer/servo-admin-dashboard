import { useRef } from 'react'
import { cx } from './cx'

/**
 * Segmented tabs. State lives with the caller (usually the URL `?tab=` param)
 * so tabs survive refreshes, deep links and browser back/forward.
 */
export default function Tabs({ tabs, value, onChange, label }) {
  const refs = useRef([])
  const onKeyDown = (e, index) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const next = (index + dir + tabs.length) % tabs.length
    refs.current[next]?.focus()
    onChange(tabs[next].value)
  }
  return (
    <div
      role="tablist"
      aria-label={label}
      className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto border-b border-line px-1"
    >
      {tabs.map((tab, i) => {
        const active = tab.value === value
        const Icon = tab.icon
        return (
          <button
            key={tab.value}
            ref={(el) => (refs.current[i] = el)}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cx(
              '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors',
              active ? 'border-brand text-brand' : 'border-transparent text-muted hover:border-line-strong hover:text-fg',
            )}
          >
            {Icon && <Icon size={16} aria-hidden="true" />}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
