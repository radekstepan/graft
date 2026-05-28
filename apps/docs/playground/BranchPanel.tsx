import React from 'react'
import { useBranchStatus, type BranchStore } from 'jotai-branch'
import { todosAtom, type Todo } from './atoms'
import type { PendingAction } from './TodoApp'

interface BranchPanelProps {
  branch: BranchStore
  pendingAction: PendingAction | null
  onCommit: () => void
  onDiscard: () => void
}

export function BranchPanel({
  branch,
  pendingAction,
  onCommit,
  onDiscard,
}: BranchPanelProps) {
  const { isDirty, size, diff } = useBranchStatus(branch)

  if (!isDirty) return null

  const changes = describeChanges(diff)

  return (
    <div style={styles.panel}>
      {pendingAction && (
        <div style={styles.spinnerRow}>
          <span className="todo-spinner" style={styles.spinner}>
            &#x27F3;
          </span>
          <span style={styles.waiting}>Waiting for your decision&hellip;</span>
        </div>
      )}
      <h4 style={styles.heading}>
        <span style={styles.icon}>&#x1F33F;</span> Branch Draft
      </h4>
      <div style={styles.changes}>
        {changes.map((change, i) => (
          <div key={i} style={styles.change}>
            {change}
          </div>
        ))}
      </div>
      <div style={styles.actions}>
        <button onClick={onCommit}>Commit</button>
        <button onClick={onDiscard}>Discard</button>
        <span style={styles.status}>
          {size} unsaved change{size !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}

function describeChanges(
  diff: Map<unknown, { branch: unknown; base: unknown }>,
): string[] {
  const result: string[] = []
  for (const [atom, { branch: branchVal, base }] of diff) {
    if (atom === todosAtom) {
      const baseTodos = base as Todo[]
      const branchTodos = branchVal as Todo[]
      result.push(...diffTodos(baseTodos, branchTodos))
    } else {
      result.push(
        `${JSON.stringify(base)} \u2192 ${JSON.stringify(branchVal)}`,
      )
    }
  }
  return result
}

function diffTodos(base: Todo[], branch: Todo[]): string[] {
  const out: string[] = []
  const branchMap = new Map(branch.map((t) => [t.id, t]))

  for (const bt of base) {
    const bt2 = branchMap.get(bt.id)
    if (!bt2) {
      out.push(`\uD83D\uDDD1\uFE0F "${bt.title}" \u2014 deleted`)
      continue
    }
    if (bt.title !== bt2.title) {
      out.push(`\u270F\uFE0F "${bt.title}" \u2192 "${bt2.title}"`)
    }
    if (bt.completed !== bt2.completed) {
      out.push(
        `${bt2.completed ? '\u2611' : '\u2610'} "${bt.title}" \u2014 ${bt2.completed ? 'completed' : 'uncompleted'}`,
      )
    }
  }

  const baseIds = new Set(base.map((t) => t.id))
  for (const bt2 of branch) {
    if (!baseIds.has(bt2.id)) {
      out.push(`\u2795 "${bt2.title}" \u2014 added`)
    }
  }

  return out
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    marginTop: '1rem',
    padding: '1rem',
    border: '1px solid var(--vp-c-brand-1)',
    borderRadius: '8px',
    backgroundColor: 'var(--vp-c-bg-soft)',
  },
  spinnerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem',
  },
  spinner: {
    fontSize: '1.2em',
    color: 'var(--vp-c-brand-1)',
  },
  waiting: {
    fontSize: '0.9em',
    fontWeight: 500,
    color: 'var(--vp-c-brand-1)',
  },
  heading: {
    margin: '0 0 0.75rem',
    color: 'var(--vp-c-brand-1)',
    fontSize: '0.95em',
  },
  icon: {
    marginRight: '0.25rem',
  },
  changes: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    marginBottom: '0.75rem',
    fontSize: '0.9em',
  },
  change: {
    fontFamily: 'var(--vp-font-family-mono)',
    color: 'var(--vp-c-text-2)',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  status: {
    fontSize: '0.85em',
    color: 'var(--vp-c-text-3)',
    marginLeft: '0.5rem',
  },
}
