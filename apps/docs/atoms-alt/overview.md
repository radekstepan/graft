# Atoms Alt Overview

`atoms-alt` explores a different paradigm for state management side-effects using a **Handler Stack** model.

Rather than side-effects living strictly inside atom write functions, `atoms-alt` introduces a middleware-like chain of handlers that intercept reads and writes across the entire store.

## The Handler Chain

A store is created with an array of Handlers. Handlers run in an onion model:

```tsx
const store = createStore([
  HistoryHandler,
  LocalStorageHandler,
  ValidatorHandler
])
```

When an atom is written, the event passes through the handlers. A handler can:
- Observe the write.
- Modify the value before it reaches the store.
- Abort the write entirely.
- Trigger side-effects asynchronously.

## When to use Atoms Alt vs Jotai Branch

- **Jotai Branch**: Use this when you want isolation (draft states, optimistic UI) but want to retain standard Jotai mechanics.
- **Atoms Alt**: Use this when you need global interception (e.g., logging every state change, syncing entire segments of state to LocalStorage, universal undo/redo histories).
