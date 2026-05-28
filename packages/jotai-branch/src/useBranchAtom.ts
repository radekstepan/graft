import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import type { Atom, WritableAtom } from 'jotai';
import type { BranchStore } from './types';

/**
 * useBranchAtom
 *
 * A typed `[value, setter]` hook that reads from and writes to a specific
 * branch store, without requiring a `<BranchProvider>` in the tree.
 *
 * This is the hook form of the `{ store: branch }` option on `useAtom`,
 * with correct generic types inferred automatically.
 *
 * Use this for **hyper-local branching** — when you only want a single
 * component to use the branch, not an entire subtree.
 *
 * @example
 * ```tsx
 * function TodoItem({ todoAtom, branch }: Props) {
 *   const [todo, setTodo] = useBranchAtom(todoAtom, branch);
 *   // reads/writes go to `branch`, not the global store
 * }
 * ```
 */
export function useBranchAtom<
  Value,
  Args extends unknown[],
  Result,
>(
  atom: WritableAtom<Value, Args, Result>,
  branch: BranchStore,
): [Value, (...args: Args) => Result] {
  return useAtom(atom, { store: branch as Parameters<typeof useAtom>[1] extends { store?: infer S } ? S : never });
}

/**
 * useBranchAtomValue
 *
 * Read-only variant of `useBranchAtom`. Subscribes to the atom's value in
 * the branch store without providing a setter.
 *
 * @example
 * ```tsx
 * const permissions = useBranchAtomValue(permissionsAtom, branch);
 * ```
 */
export function useBranchAtomValue<Value>(
  atom: Atom<Value>,
  branch: BranchStore,
): Value {
  return useAtomValue(atom, { store: branch as Parameters<typeof useAtomValue>[1] extends { store?: infer S } ? S : never });
}

/**
 * useSetBranchAtom
 *
 * Write-only variant of `useBranchAtom`. Returns a stable setter that
 * writes to the branch store without subscribing to value changes.
 *
 * @example
 * ```tsx
 * const setUser = useSetBranchAtom(userAtom, branch);
 * setUser({ name: 'Alice' }); // writes to branch, not global
 * ```
 */
export function useSetBranchAtom<
  Value,
  Args extends unknown[],
  Result,
>(
  atom: WritableAtom<Value, Args, Result>,
  branch: BranchStore,
): (...args: Args) => Result {
  return useSetAtom(atom, { store: branch as Parameters<typeof useSetAtom>[1] extends { store?: infer S } ? S : never });
}
