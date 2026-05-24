import type { Atom, WritableAtom, getDefaultStore } from 'jotai';

/** The Jotai v2 store type, inferred from getDefaultStore */
export type JotaiStore = ReturnType<typeof getDefaultStore>;

/** A subscriber callback, called whenever an atom's value changes */
export type Listener = () => void;

/** Unsubscribe function returned from subscribe */
export type Unsubscribe = () => void;

/**
 * A BranchStore is a Shadow Store layered on top of a base JotaiStore.
 *
 * It transparently intercepts reads and writes:
 *   - Reads check Mutations_B first, then fall through to the base store.
 *   - Writes land in Mutations_B only (the base store is untouched).
 *   - commit() flushes all local mutations to the base store.
 *   - discard() wipes all local mutations; subscribers are notified so
 *     the UI snaps back to the base store's values.
 *
 * It is designed to satisfy Jotai's internal StoreApi so that it can be
 * passed directly via the `store` option on useAtom, or via <Provider store={branch}>.
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
   * Flush all local overrides (Mutations_B) to the base store,
   * then clear the branch. The branch is effectively empty after this
   * and any future reads fall through to the now-updated base store.
   */
  commit(): void;

  /**
   * Discard all local overrides without touching the base store.
   * All subscribed components are notified so they re-render with
   * the base store's current values.
   */
  discard(): void;

  /**
   * Returns true if the atom has a local override in this branch.
   */
  has(atom: Atom<unknown>): boolean;

  /**
   * Returns the number of locally overridden atoms in this branch.
   */
  readonly size: number;
}
