import type { Atom, WritableAtom, getDefaultStore } from 'jotai';
import type React from 'react';

/** The Jotai v2 store type, inferred from getDefaultStore */
export type JotaiStore = ReturnType<typeof getDefaultStore>;

/** A subscriber callback, called whenever an atom's value changes */
export type Listener = () => void;

/** Unsubscribe function returned from subscribe */
export type Unsubscribe = () => void;

/**
 * A single entry in the branch diff — the value held in the branch and the
 * current value in the base store for the same atom.
 */
export interface BranchDiffEntry {
  /** Value currently stored in the branch (Mutations_B) */
  branch: unknown;
  /** Value currently stored in the base store */
  base: unknown;
}

/**
 * The reactive status snapshot returned by `useBranchStatus`.
 * Re-renders when any mutation is added, removed, committed, or discarded.
 */
export interface BranchStatus {
  /** True when the branch contains at least one local override. */
  isDirty: boolean;
  /** Number of atoms locally overridden in this branch. */
  size: number;
  /**
   * Map of every overridden atom to its `{ branch, base }` values.
   * Captured at render time — call the hook again to get a fresh snapshot.
   */
  diff: Map<Atom<unknown>, BranchDiffEntry>;
}

/**
 * Props for `<BranchProvider>`. Exported so third-party components that
 * forward or compose the provider can type their own props correctly.
 *
 * @example
 * ```tsx
 * function MyEditor({ branch, children }: BranchProviderProps & { title: string }) { ... }
 * ```
 */
export interface BranchProviderProps {
  branch: BranchStore;
  children: React.ReactNode;
}

/**
 * A BranchStore is a Shadow Store layered on top of a base JotaiStore.
 *
 * It transparently intercepts reads and writes:
 *   - Reads check Mutations_B first, then fall through to the base store.
 *   - Writes land in Mutations_B only (the base store is untouched).
 *   - `commit()` flushes all local mutations to the base store.
 *   - `discard()` wipes all local mutations; subscribers are notified so
 *     the UI snaps back to the base store's values.
 *
 * It is designed to satisfy Jotai's internal StoreApi so that it can be
 * passed directly via the `store` option on `useAtom`, or via
 * `<Provider store={branch}>` / `<BranchProvider branch={branch}>`.
 */
export interface BranchStore {
  /** Read an atom's value. Checks local overrides first. */
  get<Value>(atom: Atom<Value>): Value;

  /** Write to an atom. In a branch this lands in Mutations_B only. */
  set<Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ): Result;

  /**
   * Subscribe to changes for an atom inside this branch.
   * Handles both local mutations and base-store pass-through updates.
   */
  sub(atom: Atom<unknown>, listener: Listener): Unsubscribe;

  /**
   * Flush local overrides (Mutations_B) to the base store, then clear the
   * branch. The branch is effectively empty after this and any future reads
   * fall through to the now-updated base store.
   *
   * @example
   * // Commit all overrides
   * branch.commit();
   *
   * // Commit only specific atoms
   * branch.commit(nameAtom);
   * branch.commit([nameAtom, ageAtom]);
   */
  commit(): void;
  commit(atoms: Atom<unknown>): void;
  commit(atoms: Atom<unknown>[]): void;

  /**
   * Discard local overrides without touching the base store.
   * All subscribed components are notified so they re-render with
   * the base store's current values.
   *
   * @example
   * // Discard all overrides
   * branch.discard();
   *
   * // Discard only specific atoms
   * branch.discard(nameAtom);
   * branch.discard([nameAtom, ageAtom]);
   */
  discard(): void;
  discard(atoms: Atom<unknown>): void;
  discard(atoms: Atom<unknown>[]): void;

  /**
   * Remove a single atom from Mutations_B, reverting it to the base store's
   * current value. All branch subscribers for that atom are notified.
   * Other local overrides are unaffected.
   *
   * @example
   * // User typed in the name field — undo just that field
   * branch.reset(nameAtom);
   */
  reset(atom: Atom<unknown>): void;

  /**
   * Always reads from the base store, bypassing Mutations_B.
   * Useful for showing "original value" alongside the draft in a diff UI.
   *
   * @example
   * const original = branch.getBaseValue(userAtom);
   * const draft    = branch.get(userAtom);
   */
  getBaseValue<Value>(atom: Atom<Value>): Value;

  /**
   * Returns a snapshot of every locally overridden atom paired with its
   * branch value and current base-store value.
   *
   * The returned Map is a stable copy — it will not update after it is
   * returned. Call `diff()` again (or use `useBranchStatus`) for live data.
   *
   * @example
   * const changes = branch.diff();
   * for (const [atom, { branch, base }] of changes) {
   *   console.log(atom.toString(), base, '→', branch);
   * }
   */
  diff(): Map<Atom<unknown>, BranchDiffEntry>;

  /**
   * Returns true if the atom has a local override in this branch.
   */
  has(atom: Atom<unknown>): boolean;

  /**
   * Returns the number of locally overridden atoms in this branch.
   */
  readonly size: number;
}
