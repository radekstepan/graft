import React, { useState } from 'react'
import { useSetAtom } from 'jotai'
import { todosAtom } from './atoms'

let nextId = 10

export function TodoInput({ disabled }: { disabled?: boolean }) {
  const [text, setText] = useState('')
  const setTodos = useSetAtom(todosAtom)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const title = text.trim()
    if (!title) return
    setTodos((prev) => [...prev, { id: String(nextId++), title, completed: false }])
    setText('')
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What needs to be done?"
        disabled={disabled}
        style={{ ...styles.input, opacity: disabled ? 0.5 : 1 }}
      />
      <button type="submit" disabled={disabled || !text.trim()}>
        Add
      </button>
    </form>
  )
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '0.75rem',
  },
  input: {
    flex: 1,
  },
}
