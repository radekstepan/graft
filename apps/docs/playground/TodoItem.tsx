import React, { useState, useRef, useEffect } from 'react'
import { useSetAtom } from 'jotai'
import { todosAtom, type Todo } from './atoms'

interface TodoItemProps {
  todo: Todo
  isEditing: boolean
  isSaving: boolean
  isDeleting: boolean
  isError: boolean
  onStartEdit: (id: string) => void
  onToggle: (todo: Todo) => void
  onDelete: (id: string) => void
  onCommitEdit: () => void
  onDiscardEdit: () => void
}

export function TodoItem({
  todo,
  isEditing,
  isSaving,
  isDeleting,
  isError,
  onStartEdit,
  onToggle,
  onDelete,
  onCommitEdit,
  onDiscardEdit,
}: TodoItemProps) {
  if (isEditing) {
    return (
      <EditingItem
        todo={todo}
        onCommit={onCommitEdit}
        onDiscard={onDiscardEdit}
      />
    )
  }

  return (
    <div
      className="todo-item"
      style={{
        ...styles.item,
        opacity: isDeleting ? 0.5 : 1,
      }}
    >
      <label style={styles.checkWrap}>
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo)}
          disabled={isSaving || isDeleting}
          style={styles.checkbox}
        />
        {(isSaving || isDeleting) && <span className="todo-spinner" style={styles.spinner}>&#x27F3;</span>}
      </label>
      <span
        onDoubleClick={() => !isSaving && !isDeleting && onStartEdit(todo.id)}
        style={{
          ...styles.title,
          textDecoration: todo.completed ? 'line-through' : 'none',
          color: todo.completed
            ? 'var(--vp-c-text-3)'
            : 'var(--vp-c-text-1)',
        }}
      >
        {todo.title}
      </span>
      {isError && <span style={styles.error}>reverted!</span>}
      <button
        className="todo-delete"
        onClick={() => onDelete(todo.id)}
        disabled={isSaving || isDeleting}
        style={styles.delete}
      >
        &times;
      </button>
    </div>
  )
}

function EditingItem({
  todo,
  onCommit,
  onDiscard,
}: {
  todo: Todo
  onCommit: () => void
  onDiscard: () => void
}) {
  const setTodos = useSetAtom(todosAtom)
  const [text, setText] = useState(todo.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    setText(next)
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, title: next } : t)),
    )
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && text.trim()) onCommit()
    if (e.key === 'Escape') onDiscard()
  }

  function handleBlur() {
    if (text.trim()) onCommit()
    else onDiscard()
  }

  return (
    <div style={styles.item}>
      <input
        ref={inputRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="todo-edit-input"
        style={styles.editInput}
      />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0',
    borderBottom: '1px solid var(--vp-c-divider)',
  },
  checkWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    minWidth: '1.5rem',
  },
  checkbox: {
    cursor: 'pointer',
    width: '1rem',
    height: '1rem',
  },
  title: {
    flex: 1,
    cursor: 'pointer',
    userSelect: 'none',
  },
  delete: {
    background: 'none',
    border: 'none',
    color: 'var(--vp-c-text-3)',
    fontSize: '1.4em',
    lineHeight: 1,
    padding: '0 0.25rem',
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
  editInput: {
    flex: 1,
    borderColor: 'var(--vp-c-brand)',
  },
  spinner: {
    fontSize: '0.85em',
    color: 'var(--vp-c-brand)',
  },
  error: {
    color: 'var(--vp-c-danger-1)',
    fontSize: '0.8em',
    fontWeight: 500,
  },
}
