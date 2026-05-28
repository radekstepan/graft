import React, { useState, useCallback } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import { useBranch, BranchProvider } from 'graft'
import {
  todosAtom,
  editingIdAtom,
  filteredTodosAtom,
  type Todo,
} from './atoms'
import { TodoInput } from './TodoInput'
import { TodoItem } from './TodoItem'
import { TodoFooter } from './TodoFooter'
import { BranchPanel } from './BranchPanel'

export type PendingAction = {
  type: 'add' | 'toggle' | 'delete'
  id: string
}

let nextId = 10

export function TodoApp() {
  const branch = useBranch()
  const [editingId, setEditingId] = useAtom(editingIdAtom)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

  const isBusy = pendingAction !== null || editingId !== null

  const handleAdd = useCallback(
    (title: string) => {
      if (isBusy) return
      const id = String(nextId++)
      branch.set(todosAtom, (prev) => [
        ...prev,
        { id, title, completed: false },
      ])
      setPendingAction({ type: 'add', id })
    },
    [branch, isBusy],
  )

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
      setPendingAction({ type: 'toggle', id: todo.id })
    },
    [branch, isBusy],
  )

  const handleDelete = useCallback(
    (id: string) => {
      if (isBusy) return
      if (editingId === id) {
        branch.discard()
        setEditingId(null)
      }
      branch.set(todosAtom, (prev) => prev.filter((t) => t.id !== id))
      setPendingAction({ type: 'delete', id })
    },
    [branch, isBusy, editingId, setEditingId],
  )

  const handleClearCompleted = useCallback(() => {
    if (isBusy) return
    branch.set(todosAtom, (prev) => prev.filter((t) => !t.completed))
    setPendingAction({ type: 'delete', id: '__clear__' })
  }, [branch, isBusy])

  const handleCommit = useCallback(() => {
    if (editingId !== null) {
      handleCommitEdit()
    } else {
      branch.commit()
    }
    setPendingAction(null)
  }, [branch, editingId, handleCommitEdit])

  const handleDiscard = useCallback(() => {
    if (editingId !== null) {
      handleDiscardEdit()
    } else {
      branch.discard()
    }
    setPendingAction(null)
  }, [branch, editingId, handleDiscardEdit])

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Todo MVC</h2>
      <p style={styles.subtitle}>
        Double-click to edit &bull; You are the backend &mdash; commit or
        discard every action
      </p>
      <TodoInput disabled={isBusy} onAdd={handleAdd} />
      <BranchProvider branch={branch}>
        <TodoListSection
          editingId={editingId}
          isBusy={isBusy}
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
        pendingAction={pendingAction}
        onCommit={handleCommit}
        onDiscard={handleDiscard}
      />
    </div>
  )
}

function TodoListSection({
  editingId,
  isBusy,
  onStartEdit,
  onToggle,
  onDelete,
  onCommitEdit,
  onDiscardEdit,
}: {
  editingId: string | null
  isBusy: boolean
  onStartEdit: (id: string) => void
  onToggle: (todo: Todo) => void
  onDelete: (id: string) => void
  onCommitEdit: () => void
  onDiscardEdit: () => void
}) {
  const todos = useAtomValue(filteredTodosAtom)

  if (todos.length === 0) {
    return <div style={styles.empty}>No todos yet. Add one above!</div>
  }

  return (
    <div style={styles.list}>
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          isEditing={editingId === todo.id}
          isBusy={isBusy}
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
}
