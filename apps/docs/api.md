# API Reference

## Factory

### `createBranchStore(baseStore)`

Creates a standalone `BranchStore` layered on top of the given Jotai store. This is the low-level factory used internally by `useBranch()` but can also be called directly when you need a branch outside of React (e.g. in tests, stores, or server-side code).

```ts
function createBranchStore(baseStore: JotaiStore): BranchStore
```

**Parameters**

| Parameter   | Type          | Description                                           |
| ----------- | ------------- | ----------------------------------------------------- |
| `baseStore` | `JotaiStore`  | The underlying Jotai store to branch from.            |

**Returns** — A new `BranchStore` instance.

**Behavior**

- Reads check local overrides first, then fall through to `baseStore`.
- Writes land in the branch only — `baseStore` is never modified directly.
- You can layer branches: `createBranchStore(outerBranch)` creates a nested branch. Inner overrides shadow outer ones; unshadowed atoms fall through to the outer branch, then to the base.

**Example**

```ts
import { createStore } from 'jotai'
import { createBranchStore } from 'graft'

const base = createStore()
const branch = createBranchStore(base)

branch.set(nameAtom, 'Draft')
base.get(nameAtom)   // 'Alice' — untouched
branch.get(nameAtom) // 'Draft'

branch.commit()
base.get(nameAtom)   // 'Draft' — now flushed
```

**Nested branches**

```ts
const outer = createBranchStore(base)
outer.set(nameAtom, 'Outer')

const inner = createBranchStore(outer as any)
inner.set(nameAtom, 'Inner')

inner.get(nameAtom)  // 'Inner'
outer.get(nameAtom)  // 'Outer'
base.get(nameAtom)   // 'Alice'
```

---

## Components

### `<BranchProvider>`

Redirects all `useAtom` calls within its subtree to the provided branch store. Internally wraps Jotai's `<Provider>` with the branch as the store, so child components don't need any changes — they call `useAtom` as usual.

```tsx
function BranchProvider(props: BranchProviderProps): JSX.Element
```

**Props**

| Prop      | Type              | Description                                      |
| --------- | ----------------- | ------------------------------------------------ |
| `branch`  | `BranchStore`     | The branch store to provide to the subtree.      |
| `children`| `React.ReactNode` | The React subtree that will read/write the branch. |

**Behavior**

- All `useAtom()`, `useAtomValue()`, and `useSetAtom()` calls inside the subtree transparently resolve to the branch store.
- Writes from child components land in the branch — the base store is untouched.
- Derived atoms automatically recalculate using branch overrides for their dependencies.
- You can nest `<BranchProvider>` components to create deeper branching layers.

**Example**

```tsx
import { useAtom } from 'jotai'
import { BranchProvider, useBranch } from 'graft'

function ProfileForm() {
  const [name, setName] = useAtom(nameAtom)
  return <input value={name} onChange={e => setName(e.target.value)} />
}

function Editor() {
  const branch = useBranch()
  return (
    <BranchProvider branch={branch}>
      <ProfileForm />
      <button onClick={() => branch.commit()}>Save</button>
      <button onClick={() => branch.discard()}>Cancel</button>
    </BranchProvider>
  )
}
```

---

## Hooks

### `useBranch()`

Creates a new `BranchStore` connected to the nearest Jotai `<Provider>` in the component tree (or the global default store if none exists). Returns a stable reference that persists across re-renders.

```ts
function useBranch(): BranchStore
```

**Returns** — A stable `BranchStore` reference, created once on mount.

**Behavior**

- The branch is created once per component mount and is stable across re-renders (same reference guaranteed).
- It is **not** automatically discarded or committed on unmount — you control the lifecycle explicitly via `branch.commit()` and `branch.discard()`, or use the `useCommitOnUnmount` / `useDiscardOnUnmount` helpers.
- Links to the nearest Jotai store in context. If your app uses `<Provider store={customStore}>`, the branch will shadow that store.

**Example**

```tsx
function Editor() {
  const branch = useBranch()
  const { isDirty } = useBranchStatus(branch)

  return (
    <BranchProvider branch={branch}>
      <Form />
      {isDirty && (
        <>
          <button onClick={() => branch.commit()}>Save</button>
          <button onClick={() => branch.discard()}>Cancel</button>
        </>
      )}
    </BranchProvider>
  )
}
```

---

### `useBranchStatus(branch)`

Returns a reactive snapshot of the branch's state. The component re-renders automatically whenever atoms are modified, committed, or discarded in the branch.

```ts
function useBranchStatus(branch: BranchStore): BranchStatus
```

**Parameters**

| Parameter | Type           | Description                       |
| --------- | -------------- | --------------------------------- |
| `branch`  | `BranchStore`  | The branch to observe.            |

**Returns** — A `BranchStatus` object:

| Field     | Type                                | Description                                                    |
| --------- | ----------------------------------- | -------------------------------------------------------------- |
| `isDirty` | `boolean`                           | `true` if the branch contains at least one local override.     |
| `size`    | `number`                            | The number of atoms overridden in this branch.                 |
| `diff`    | `Map<Atom, BranchDiffEntry>`        | A stable snapshot of every overridden atom and its values.     |

The `diff` map is captured at render time — it will not mutate after being returned. The hook produces a new snapshot only when the branch state actually changes, thanks to internal caching with `useSyncExternalStore`.

**Example**

```tsx
function SaveBar({ branch }: { branch: BranchStore }) {
  const { isDirty, size, diff } = useBranchStatus(branch)

  if (!isDirty) return null

  return (
    <div>
      {size} change{size !== 1 ? 's' : ''} pending
      <button onClick={() => branch.commit()}>Save</button>
      <button onClick={() => branch.discard()}>Discard</button>
    </div>
  )
}
```

**Diff inspection**

```tsx
const { diff } = useBranchStatus(branch)
for (const [atom, { branch: branchVal, base: baseVal }] of diff) {
  console.log('Changed:', baseVal, '→', branchVal)
}
```

---

### `useBranchAtom(atom, branch)`

A typed `[value, setter]` hook that reads from and writes to a specific branch store, without requiring a `<BranchProvider>` in the tree. This is the hook equivalent of passing `{ store: branch }` to Jotai's `useAtom`, with full TypeScript inference.

```ts
function useBranchAtom<Value, Args extends unknown[], Result>(
  atom: WritableAtom<Value, Args, Result>,
  branch: BranchStore,
): [Value, (...args: Args) => Result]
```

**Parameters**

| Parameter | Type                                | Description                                   |
| --------- | ------------------------------------ | --------------------------------------------- |
| `atom`    | `WritableAtom<Value, Args, Result>` | The writable atom to bind to the branch.      |
| `branch`  | `BranchStore`                        | The branch store to read from and write to.   |

**Returns** — A tuple `[value, setValue]`, identical in shape to `useAtom`.

**When to use**

Use this for **hyper-local branching** — when only a single component needs the branch, not an entire subtree. For subtree-wide branching, prefer `<BranchProvider>`.

**Example**

```tsx
function TodoItem({ todoAtom, branch }: Props) {
  const [todo, setTodo] = useBranchAtom(todoAtom, branch)
  // reads/writes go to `branch`, not the global store
  return (
    <input
      value={todo.text}
      onChange={e => setTodo({ ...todo, text: e.target.value })}
    />
  )
}
```

---

### `useBranchAtomValue(atom, branch)`

Read-only variant of `useBranchAtom`. Subscribes to the atom's value in the branch store without providing a setter.

```ts
function useBranchAtomValue<Value>(
  atom: Atom<Value>,
  branch: BranchStore,
): Value
```

**Parameters**

| Parameter | Type          | Description                                 |
| --------- | ------------- | ------------------------------------------- |
| `atom`    | `Atom<Value>` | Any Jotai atom (primitive or derived).      |
| `branch`  | `BranchStore` | The branch store to read from.              |

**Returns** — The current value of the atom in the branch.

**Example**

```tsx
const permissions = useBranchAtomValue(permissionsAtom, branch)
```

---

### `useSetBranchAtom(atom, branch)`

Write-only variant of `useBranchAtom`. Returns a stable setter function that writes to the branch store without subscribing to value changes. Useful when a component only needs to dispatch writes, not react to reads.

```ts
function useSetBranchAtom<Value, Args extends unknown[], Result>(
  atom: WritableAtom<Value, Args, Result>,
  branch: BranchStore,
): (...args: Args) => Result
```

**Parameters**

| Parameter | Type                                | Description                                   |
| --------- | ------------------------------------ | --------------------------------------------- |
| `atom`    | `WritableAtom<Value, Args, Result>` | The writable atom to set on the branch.       |
| `branch`  | `BranchStore`                        | The branch store to write to.                 |

**Returns** — A stable setter function.

**Example**

```tsx
const setUser = useSetBranchAtom(userAtom, branch)
setUser({ name: 'Alice' }) // writes to branch, not global
```

---

### `useCommitOnUnmount(branch)`

Calls `branch.commit()` when the component unmounts. Designed for "fire-and-forget" optimistic updates — mount a branch, render optimistically, and flush automatically when the feature component is removed from the tree.

```ts
function useCommitOnUnmount(branch: BranchStore): void
```

**Parameters**

| Parameter | Type           | Description                          |
| --------- | -------------- | ------------------------------------ |
| `branch`  | `BranchStore`  | The branch to commit on unmount.     |

**Example**

```tsx
function OptimisticFeature() {
  const branch = useBranch()
  useCommitOnUnmount(branch)
  // When this component unmounts, all branch changes are flushed to the base store
  return <BranchProvider branch={branch}><Form /></BranchProvider>
}
```

---

### `useDiscardOnUnmount(branch)`

Calls `branch.discard()` when the component unmounts. The canonical pattern for optimistic UI with rollback — apply changes to the branch, await a network call, and either commit on success or let unmount handle the rollback on failure.

```ts
function useDiscardOnUnmount(branch: BranchStore): void
```

**Parameters**

| Parameter | Type           | Description                          |
| --------- | -------------- | ------------------------------------ |
| `branch`  | `BranchStore`  | The branch to discard on unmount.    |

**Example**

```tsx
function OptimisticRow({ todoAtom }: Props) {
  const branch = useBranch()
  useDiscardOnUnmount(branch)

  const [todo, setTodo] = useBranchAtom(todoAtom, branch)

  const save = async () => {
    setTodo({ ...todo, done: true })
    try {
      await api.save(todo.id)
      branch.commit()
    } catch {
      branch.discard()
    }
  }
}
```

---

## BranchStore Methods

The `BranchStore` object returned by `useBranch()` or `createBranchStore()` implements Jotai's internal `StoreApi` interface so it can be passed directly to `<Provider store={...}>`, `useAtom(atom, { store })`, etc.

### `get(atom)`

Reads an atom's value. Checks local overrides first; if the atom is not overridden, falls through to the base store. For derived atoms, the read function is re-evaluated using a branch-aware getter so that dependency overrides are visible.

```ts
get<Value>(atom: Atom<Value>): Value
```

**Behavior**

- **Primitive atoms** — returns the branch override if present, otherwise the base store value.
- **Derived atoms** — re-runs the atom's `read` function with a branch-aware `get` so that any overridden dependencies are resolved from the branch. Async derived atoms receive a real `AbortSignal`; stale reads are automatically aborted when a new read is triggered.

---

### `set(atom, ...args)`

Writes to an atom. In a branch, the write lands in the local override map only — the base store is never modified.

```ts
set<Value, Args extends unknown[], Result>(
  atom: WritableAtom<Value, Args, Result>,
  ...args: Args
): Result
```

**Behavior**

- For primitive atoms, the value is stored directly in the branch.
- For derived/writable atoms, the atom's `write` function is called with a branch-aware proxy store, so self-writes land in the branch and writes to other atoms recurse through the branch.
- Branch listeners for the atom are notified after the write.

---

### `sub(atom, listener)`

Subscribes to changes for a specific atom within the branch. Compatible with React's `useSyncExternalStore`.

```ts
sub(atom: Atom<unknown>, listener: Listener): Unsubscribe
```

**Parameters**

| Parameter  | Type        | Description                                       |
| ---------- | ----------- | ------------------------------------------------- |
| `atom`     | `Atom`      | The atom to subscribe to.                         |
| `listener` | `Listener`  | Callback invoked when the atom's value changes.   |

**Returns** — An `Unsubscribe` function.

**Behavior**

- Registers the listener and simultaneously subscribes to the base store for that atom.
- When the base store fires a change for that atom:
  - If the atom **is** overridden in the branch, the update is **swallowed** (the branch value shadows the base).
  - If the atom **is not** overridden, the update is **forwarded** to branch listeners.
- When the last listener for an atom unsubscribes, the base store subscription is also cleaned up.

---

### `commit()`

Flushes local overrides to the base store and clears the branch. After committing, the branch is empty and all future reads fall through to the (now-updated) base store.

```ts
commit(): void
commit(atoms: Atom<unknown>): void
commit(atoms: Atom<unknown>[]): void
```

**Overloads**

| Signature                   | Description                                       |
| --------------------------- | ------------------------------------------------- |
| `commit()`                  | Flush **all** overrides to the base store.        |
| `commit(atom)`              | Flush only a single atom to the base store.       |
| `commit([atomA, atomB, …])` | Flush only the specified atoms to the base store. |

**Behavior**

- Each flushed atom is written to the base store via `baseStore.set()`, then removed from the branch.
- Only listeners for the committed atom(s) are notified — other branch subscribers are unaffected.
- Fires internal `_onCommit` lifecycle callbacks.

**Example**

```ts
branch.set(nameAtom, 'Bob')
branch.set(ageAtom, 30)

// Commit everything
branch.commit()

// Or commit only the name
branch.commit(nameAtom)
// ageAtom is still a draft
```

---

### `discard()`

Wipes local overrides without touching the base store. All subscribed components are notified so they re-render with the base store's current values.

```ts
discard(): void
discard(atoms: Atom<unknown>): void
discard(atoms: Atom<unknown>[]): void
```

**Overloads**

| Signature                    | Description                                        |
| ---------------------------- | -------------------------------------------------- |
| `discard()`                  | Discard **all** overrides.                         |
| `discard(atom)`              | Discard only a single atom.                        |
| `discard([atomA, atomB, …])` | Discard only the specified atoms.                  |

**Behavior**

- Overrides are removed from the branch; the base store is untouched.
- Only listeners for the discarded atom(s) are notified.
- Fires internal `_onDiscard` lifecycle callbacks.

**Example**

```ts
branch.set(nameAtom, 'Draft')
branch.set(ageAtom, 99)

// Discard everything
branch.discard()

// Or discard only the name
branch.discard(nameAtom)
// ageAtom is still a draft
```

---

### `reset(atom)`

Removes a single atom from the branch, reverting it to the base store's current value. Other local overrides are unaffected. Equivalent to `discard(atom)` for a single atom.

```ts
reset(atom: Atom<unknown>): void
```

**Parameters**

| Parameter | Type    | Description                                       |
| --------- | ------- | ------------------------------------------------- |
| `atom`    | `Atom`  | The atom to remove from the branch.               |

**Behavior**

- If the atom is not overridden, this is a no-op (no listeners are notified).
- Fires internal `_onDiscard` lifecycle callbacks.

**Example**

```ts
branch.set(nameAtom, 'Draft')
branch.set(ageAtom, 99)
branch.reset(nameAtom)
// nameAtom reverts to base value; ageAtom is still '99'
```

---

### `getBaseValue(atom)`

Always reads from the base store, bypassing any branch overrides. Useful for showing "original" vs. "draft" values side by side.

```ts
getBaseValue<Value>(atom: Atom<Value>): Value
```

**Example**

```ts
const original = branch.getBaseValue(userAtom)
const draft = branch.get(userAtom)
```

---

### `diff()`

Returns a snapshot of every locally overridden atom, paired with its branch value and current base-store value. The returned `Map` is a stable copy — it will not update after being returned. Call `diff()` again (or use `useBranchStatus`) for live data.

```ts
diff(): Map<Atom<unknown>, BranchDiffEntry>
```

**Example**

```ts
const changes = branch.diff()
for (const [atom, { branch: branchVal, base: baseVal }] of changes) {
  console.log('Changed:', baseVal, '→', branchVal)
}
```

---

### `has(atom)`

Returns `true` if the atom has a local override in this branch.

```ts
has(atom: Atom<unknown>): boolean
```

**Example**

```ts
branch.set(nameAtom, 'Draft')
branch.has(nameAtom) // true
branch.has(ageAtom)  // false
```

---

### `size`

A read-only property returning the number of locally overridden atoms in this branch.

```ts
readonly size: number
```

**Example**

```ts
branch.set(nameAtom, 'A')
branch.set(ageAtom, 30)
branch.size // 2
branch.discard(nameAtom)
branch.size // 1
```

---

## Types

### `BranchStore`

The main branch store interface. Implements Jotai's `StoreApi` (`get`, `set`, `sub`) plus branching methods (`commit`, `discard`, `reset`, `getBaseValue`, `diff`, `has`, `size`).

See the [BranchStore Methods](#branchstore-methods) section above for full details on each method.

---

### `BranchStatus`

The reactive snapshot returned by `useBranchStatus(branch)`.

```ts
interface BranchStatus {
  isDirty: boolean
  size: number
  diff: Map<Atom<unknown>, BranchDiffEntry>
}
```

| Field     | Type                          | Description                                                    |
| --------- | ----------------------------- | -------------------------------------------------------------- |
| `isDirty` | `boolean`                     | `true` when at least one atom is overridden.                   |
| `size`    | `number`                      | Count of overridden atoms.                                     |
| `diff`    | `Map<Atom, BranchDiffEntry>`  | Snapshot of all overrides with branch and base values.         |

---

### `BranchDiffEntry`

A single entry in the branch diff — the value held in the branch and the current value in the base store for the same atom.

```ts
interface BranchDiffEntry {
  branch: unknown
  base: unknown
}
```

| Field     | Type      | Description                                     |
| --------- | --------- | ----------------------------------------------- |
| `branch`  | `unknown` | Value currently stored in the branch override.  |
| `base`    | `unknown` | Value currently stored in the base store.       |

---

### `BranchProviderProps`

Props for the `<BranchProvider>` component.

```ts
interface BranchProviderProps {
  branch: BranchStore
  children: React.ReactNode
}
```

---

### `JotaiStore`

The Jotai v2 store type, inferred from `getDefaultStore`. This is the type accepted as the `baseStore` argument to `createBranchStore()`.

```ts
type JotaiStore = ReturnType<typeof getDefaultStore>
```

---

### `Listener`

A subscriber callback, called whenever an atom's value changes.

```ts
type Listener = () => void
```

---

### `Unsubscribe`

Unsubscribe function returned from `sub()`.

```ts
type Unsubscribe = () => void
```
