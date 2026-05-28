# graft

Graft — a Shadow Store extension for [Jotai](https://jotai.org) v2.

Create isolated "draft" stores on top of a base Jotai store. Mutations stay local until you explicitly commit or discard them.

## Install

```bash
npm install graft
# or
yarn add graft
```

> **Peer dependencies:** `jotai@^2.0.0`, `react@^18.0.0 || ^19.0.0`

## Quick Start

```tsx
import { atom, useAtom } from 'jotai';
import {
  useBranch,
  BranchProvider,
  useBranchStatus,
} from 'graft';

const nameAtom = atom('Alice');
const ageAtom = atom(30);

function Editor() {
  const branch = useBranch();
  const { isDirty, size } = useBranchStatus(branch);

  return (
    <BranchProvider branch={branch}>
      <Form />
      <button disabled={!isDirty} onClick={() => branch.commit()}>
        Save ({size} change{size !== 1 ? 's' : ''})
      </button>
      <button disabled={!isDirty} onClick={() => branch.discard()}>
        Cancel
      </button>
    </BranchProvider>
  );
}

function Form() {
  const [name, setName] = useAtom(nameAtom);
  const [age, setAge] = useAtom(ageAtom);
  // reads/writes go to the branch — the base store is untouched
  return (
    <div>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <input value={age} onChange={(e) => setAge(Number(e.target.value))} />
    </div>
  );
}
```

## API

### `useBranch(): BranchStore`

Creates a stable `BranchStore` linked to the nearest Jotai store in context. The branch is created once per component mount and reused across re-renders.

### `BranchProvider`

Wraps Jotai's `<Provider>` so all `useAtom()` calls inside the subtree transparently read from and write to the branch store.

**Props:** `branch: BranchStore`, `children: ReactNode`

### `useBranchStatus(branch): BranchStatus`

Returns a reactive snapshot of the branch's dirty state. Re-renders on every mutation, commit, or discard.

```ts
interface BranchStatus {
  isDirty: boolean;       // true if any atom is overridden
  size: number;           // number of overridden atoms
  diff: Map<Atom, { branch: unknown; base: unknown }>;
}
```

### `useBranchAtom(atom, branch)`

A `[value, setter]` hook for a specific branch — no `<BranchProvider>` needed. Use for single-component branching.

### `useBranchAtomValue(atom, branch)` / `useSetBranchAtom(atom, branch)`

Read-only and write-only variants of `useBranchAtom`.

### `useCommitOnUnmount(branch)` / `useDiscardOnUnmount(branch)`

Lifecycle hooks that automatically commit or discard the branch when the owning component unmounts.

### `createBranchStore(baseStore): BranchStore`

Low-level factory. Creates a branch store on top of any Jotai store. Use this if you need a branch outside of React.

## BranchStore Methods

| Method | Description |
|---|---|
| `get(atom)` | Read an atom's value (branch override, then base) |
| `set(atom, value)` | Write to the branch only (base untouched) |
| `sub(atom, listener)` | Subscribe to atom changes within the branch |
| `commit()` | Flush all overrides to the base store |
| `commit(atom)` | Flush a single atom override |
| `commit([a, b])` | Flush specific atom overrides |
| `discard()` | Drop all overrides (base untouched) |
| `discard(atom)` | Drop a single atom override |
| `discard([a, b])` | Drop specific atom overrides |
| `reset(atom)` | Remove a single atom override (alias for `discard(atom)`) |
| `has(atom)` | Check if an atom is overridden in the branch |
| `diff()` | Snapshot of all overrides with `{ branch, base }` values |
| `getBaseValue(atom)` | Read from the base store, ignoring branch overrides |
| `size` | Number of overridden atoms |

## Async & Suspense

Derived atoms that use `async` read functions receive a real `AbortSignal` for stale-request cancellation:

```tsx
const dataAtom = atom(async (get, { signal }) => {
  const res = await fetch('/api/data', { signal });
  return res.json();
});
```

When a dependency changes and the branch re-reads the atom, the previous request is automatically aborted.

## Nested Branches

Branches can be stacked — an inner branch shadows an outer branch, which shadows the base store:

```tsx
const base = createStore();
const outer = createBranchStore(base);
const inner = createBranchStore(outer as any);
```

## Build

```bash
yarn build    # tsup → dist/index.js (ESM) + dist/index.cjs (CJS) + .d.ts
yarn test     # vitest
yarn typecheck
```

## License

MIT
