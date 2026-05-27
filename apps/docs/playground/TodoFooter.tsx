import React from 'react'
import { useAtom, useAtomValue } from 'jotai'
import { filterAtom, activeCountAtom, completedCountAtom, type Filter } from './atoms'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

export function TodoFooter({
  onClearCompleted,
}: {
  onClearCompleted: () => void
}) {
  const [filter, setFilter] = useAtom(filterAtom)
  const activeCount = useAtomValue(activeCountAtom)
  const completedCount = useAtomValue(completedCountAtom)

  if (activeCount + completedCount === 0) return null

  return (
    <div style={styles.footer}>
      <span style={styles.count}>
        {activeCount} item{activeCount !== 1 ? 's' : ''} left
      </span>
      <div style={styles.filters}>
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={filter === value ? 'todo-filter-active' : ''}
            style={{
              ...styles.filterBtn,
              ...(filter === value ? styles.filterActive : {}),
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {completedCount > 0 && (
        <button onClick={onClearCompleted} style={styles.clearBtn}>
          Clear completed
        </button>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 0',
    fontSize: '0.9em',
    color: 'var(--vp-c-text-2)',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  count: {
    whiteSpace: 'nowrap',
  },
  filters: {
    display: 'flex',
    gap: '0.25rem',
  },
  filterBtn: {
    padding: '2px 10px',
    border: '1px solid transparent',
    background: 'none',
    cursor: 'pointer',
    borderRadius: '4px',
    color: 'var(--vp-c-text-2)',
    fontSize: 'inherit',
    fontWeight: 500,
  },
  filterActive: {
    border: '1px solid var(--vp-c-brand-1)',
    color: 'var(--vp-c-brand-1)',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--vp-c-text-2)',
    fontSize: 'inherit',
  },
}
