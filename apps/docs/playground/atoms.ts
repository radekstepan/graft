import { atom } from 'jotai'

export interface Todo {
  id: string
  title: string
  completed: boolean
}

export type Filter = 'all' | 'active' | 'completed'

export const todosAtom = atom<Todo[]>([
  { id: '1', title: 'Learn Jotai', completed: false },
  { id: '2', title: 'Try jotai-branch', completed: false },
  { id: '3', title: 'Build something amazing', completed: false },
])

export const filterAtom = atom<Filter>('all')

export const editingIdAtom = atom<string | null>(null)

export const filteredTodosAtom = atom((get) => {
  const todos = get(todosAtom)
  const filter = get(filterAtom)
  switch (filter) {
    case 'active':
      return todos.filter((t) => !t.completed)
    case 'completed':
      return todos.filter((t) => t.completed)
    default:
      return todos
  }
})

export const activeCountAtom = atom((get) => {
  return get(todosAtom).filter((t) => !t.completed).length
})

export const completedCountAtom = atom((get) => {
  return get(todosAtom).filter((t) => t.completed).length
})
