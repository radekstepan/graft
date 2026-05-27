import React from 'react'
import { Provider } from 'jotai'
import { TodoApp } from './TodoApp'

export function App() {
  return (
    <Provider>
      <TodoApp />
    </Provider>
  )
}
