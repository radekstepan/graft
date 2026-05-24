# API Reference

## Components

### `<BranchProvider>`
Redirects all `useAtom` calls within its subtree to the provided branch store.

```tsx
<BranchProvider branch={branch}>
  <App />
</BranchProvider>
```

## Hooks

### `useBranch()`
Creates a new branch connected to the nearest Jotai `<Provider>` (or the default global store if none exists). Returns a stable `BranchStore` reference.

### `useBranchStatus(branch)`
Returns a reactive snapshot of the branch's state. Re-renders automatically when atoms are modified in the branch, committed, or discarded.

```tsx
const { isDirty, size, diff } = useBranchStatus(branch);
```
- `isDirty`: boolean. True if there is at least one local override.
- `size`: number. The number of overridden atoms.
- `diff`: `Map<Atom, { branch, base }>`. A stable map of the overrides.

### `useBranchAtom(atom, branch)`
A hook for hyper-local branching. Reads and writes the atom specifically to the given branch store, bypassing the need for a `<BranchProvider>`.

### `useCommitOnUnmount(branch)` / `useDiscardOnUnmount(branch)`
Lifecycle hooks for optimistic UI. Automatically calls `commit()` or `discard()` when the component unmounts.

## BranchStore Methods

The `BranchStore` returned by `useBranch()` exposes several methods:

- `commit()`: Flush all local overrides to the base store.
- `discard()`: Wipe all local overrides; subscribers revert to base values.
- `reset(atom)`: Remove a single atom from the branch, reverting it to its base value.
- `getBaseValue(atom)`: Always reads from the base store, bypassing any branch overrides.
- `diff()`: Returns a snapshot of overridden atoms.
