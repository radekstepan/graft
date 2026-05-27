import React, { useState, useCallback } from 'react'
import { useAtom, useSetAtom, useAtomValue } from 'jotai'
import { useBranch, BranchProvider } from 'jotai-branch'
import {
  todosAtom,
  editingIdAtom,
  filteredTodosAtom,
  apiDelayAtom,
  type Todo,
} from './atoms'
import { TodoInput } from './TodoInput'
import { TodoItem } from './TodoItem'
import { TodoFooter } from './TodoFooter'
import { BranchPanel } from './BranchPanel'

export function TodoApp() {
  const branch = useBranch()
  const [editingId, setEditingId] = useAtom(editingIdAtom)
  const setTodosGlobal = useSetAtom(todosAtom)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)
  const [apiDelay, setApiDelay] = useAtom(apiDelayAtom)

  const isBusy = savingId !== null || editingId !== null || deletingId !== null

  const handleStartEdit = useCallback(
    (id: string) => {
      if (isBusy) return
      setEditingId(id)
    },
    [isBusy, setEditingId],
  )

  const handleCommitEdit = useCallback(() => {
    branch.commit()
    setEditingId(null)
  }, [branch, setEditingId])

  const handleDiscardEdit = useCallback(() => {
    branch.discard()
    setEditingId(null)
  }, [branch, setEditingId])

  const handleToggle = useCallback(
    (todo: Todo) => {
      if (isBusy) return
      branch.set(todosAtom, (prev) =>
        prev.map((t) =>
          t.id === todo.id ? { ...t, completed: !t.completed } : t,
        ),
      )
      const id = todo.id
      setSavingId(id)
      setTimeout(() => {
        if (Math.random() > 0.1) {
          branch.commit()
        } else {
          branch.discard()
          setErrorId(id)
          setTimeout(() => setErrorId(null), 2000)
        }
        setSavingId(null)
      }, apiDelay)
    },
    [branch, isBusy, apiDelay],
  )

  const handleDelete = useCallback(
    (id: string) => {
      if (isBusy) return
      if (editingId === id) {
        branch.discard()
        setEditingId(null)
      }
      branch.set(todosAtom, (prev) => prev.filter((t) => t.id !== id))
      setDeletingId(id)
      setTimeout(() => {
        if (Math.random() > 0.1) {
          branch.commit()
        } else {
          branch.discard()
          setErrorId(id)
          setTimeout(() => setErrorId(null), 2000)
        }
        setDeletingId(null)
      }, apiDelay)
    },
    [branch, isBusy, editingId, apiDelay, setEditingId],
  )

  const handleClearCompleted = useCallback(() => {
    setTodosGlobal((prev) => prev.filter((t) => !t.completed))
  }, [setTodosGlobal])

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Todo MVC</h2>
      <p style={styles.subtitle}>
        Double-click to edit &bull; Checkbox toggles with optimistic UI (10%
        simulated failure)
      </p>
      <div style={styles.sliderRow}>
        <label style={styles.sliderLabel}>API delay</label>
        <input
          type="range"
          min={0}
          max={3000}
          step={100}
          value={apiDelay}
          onChange={(e) => setApiDelay(Number(e.target.value))}
          style={styles.slider}
        />
        <span style={styles.sliderValue}>{apiDelay}ms</span>
      </div>
      <TodoInput disabled={isBusy} />
      <BranchProvider branch={branch}>
        <TodoListSection
          editingId={editingId}
          savingId={savingId}
          deletingId={deletingId}
          errorId={errorId}
          onStartEdit={handleStartEdit}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onCommitEdit={handleCommitEdit}
          onDiscardEdit={handleDiscardEdit}
        />
        <TodoFooter onClearCompleted={handleClearCompleted} />
      </BranchProvider>
      <BranchPanel
        branch={branch}
        onCommit={editingId !== null ? handleCommitEdit : () => branch.commit()}
        onDiscard={editingId !== null ? handleDiscardEdit : () => branch.discard()}
      />
    </div>
  )
}

function TodoListSection({
  editingId,
  savingId,
  deletingId,
  errorId,
  onStartEdit,
  onToggle,
  onDelete,
  onCommitEdit,
  onDiscardEdit,
}: {
  editingId: string | null
  savingId: string | null
  deletingId: string | null
  errorId: string | null
  onStartEdit: (id: string) => void
  onToggle: (todo: Todo) => void
  onDelete: (id: string) => void
  onCommitEdit: () => void
  onDiscardEdit: () => void
}) {
  const todos = useAtomValue(filteredTodosAtom)

  if (todos.length === 0) {
    return (
      <div style={styles.empty}>No todos yet. Add one above!</div>
    )
  }

  return (
    <div style={styles.list}>
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          isEditing={editingId === todo.id}
          isSaving={savingId === todo.id}
          isDeleting={deletingId === todo.id}
          isError={errorId === todo.id}
          onStartEdit={onStartEdit}
          onToggle={onToggle}
          onDelete={onDelete}
          onCommitEdit={onCommitEdit}
          onDiscardEdit={onDiscardEdit}
        />
      ))}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: 'var(--vp-font-family-base)',
    marginTop: '1rem',
  },
  heading: {
    margin: '0 0 0.25rem',
    fontSize: '1.5em',
  },
  subtitle: {
    margin: '0 0 1rem',
    fontSize: '0.9em',
    color: 'var(--vp-c-text-3)',
  },
  list: {
    borderTop: '1px solid var(--vp-c-divider)',
  },
  empty: {
    padding: '1.5rem 0',
    textAlign: 'center',
    color: 'var(--vp-c-text-3)',
    fontSize: '0.9em',
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.75rem',
    fontSize: '0.85em',
    color: 'var(--vp-c-text-2)',
  },
  sliderLabel: {
    whiteSpace: 'nowrap',
    fontWeight: 500,
  },
  slider: {
    flex: 1,
    cursor: 'pointer',
    accentColor: 'var(--vp-c-brand-1)',
  },
  sliderValue: {
    fontFamily: 'var(--vp-font-family-mono)',
    whiteSpace: 'nowrap',
    minWidth: '3.5em',
    textAlign: 'right',
  },
}
