import type { Atom, WritableAtom } from 'jotai';
import type { BranchStore, JotaiStore, Listener, Unsubscribe } from './types';

/**
 * createBranchStore
 *
 * Creates a Shadow Store (BranchStore) on top of a base JotaiStore.
 *
 * Architecture:
 *   Mutations_B  — Map<Atom, value> — local atom overrides
 *   listeners    — Map<Atom, Set<Listener>> — per-atom branch subscribers
 *   baseSubs     — Map<Atom, Unsubscribe> — subscriptions held on the base store
 *
 * Read path:
 *   get(atom) → Mutations_B.has(atom) ? Mutations_B.get(atom) : baseStore.get(atom)
 *
 * Write path (for primitive atoms — atom(initialValue)):
 *   set(atom, value) → Mutations_B.set(atom, value) → notify branch listeners
 *
 * Write path (for derived atoms with custom write — atom(get => ..., (get, set, arg) => ...)):
 *   The atom's write function is called with a proxy that intercepts self-writes
 *   into Mutations_B and passes other atom writes back through the branch.
 *
 * Subscribe path (useSyncExternalStore compatible):
 *   sub(atom, listener):
 *     1. Register listener in branch listeners map
 *     2. Subscribe to base store for that atom
 *        → on base update: if atom NOT in Mutations_B, forward to branch listeners
 *        → if atom IS in Mutations_B, swallow (branch value shadows base)
 *
 * commit():
 *   For each (atom, value) in Mutations_B → baseStore.set(atom, value)
 *   Then clear Mutations_B
 *
 * discard():
 *   Clear Mutations_B → notify all branch listeners (UI snaps to base values)
 */
export function createBranchStore(baseStore: JotaiStore): BranchStore {
  // Local overrides: atom → value
  const mutations = new Map<Atom<unknown>, unknown>();

  // Per-atom branch subscribers
  const listeners = new Map<Atom<unknown>, Set<Listener>>();

  // Subscriptions we hold on the base store (one per atom ever subscribed)
  const baseSubs = new Map<Atom<unknown>, Unsubscribe>();

  /** Notify all branch listeners watching a specific atom */
  function notifyAtom(atom: Atom<unknown>) {
    const set = listeners.get(atom);
    if (set) {
      for (const fn of set) fn();
    }
  }

  /** Notify all branch listeners for every atom we track */
  function notifyAll() {
    for (const [atom] of listeners) {
      notifyAtom(atom);
    }
  }

  /**
   * Ensure we have a live subscription to the base store for `atom`.
   * Forwards base-store changes to branch listeners only when not shadowed.
   */
  function ensureBaseSub(atom: Atom<unknown>) {
    if (baseSubs.has(atom)) return;

    const unsub = baseStore.sub(atom, () => {
      // If this atom is locally overridden, swallow the base update.
      if (!mutations.has(atom)) {
        notifyAtom(atom);
      }
    });

    baseSubs.set(atom, unsub);
  }

  // Forward-declare so the set implementation can reference it recursively
  // eslint-disable-next-line prefer-const
  let branchSet: BranchStore['set'];

  /**
   * Proxy store passed to atom.write().
   * get → reads from branch (local overrides first)
   * set → writes to branch (Mutations_B)
   */
  function makeBranchProxy(): JotaiStore {
    return {
      get: <V>(a: Atom<V>) => branchGet(a),
      set: <V, A extends unknown[], R>(a: WritableAtom<V, A, R>, ...args: A): R =>
        branchSet(a, ...args),
      sub: baseStore.sub,
    };
  }

  function branchGet<Value>(atom: Atom<Value>): Value {
    if (mutations.has(atom as Atom<unknown>)) {
      return mutations.get(atom as Atom<unknown>) as Value;
    }
    return baseStore.get(atom);
  }

  branchSet = function branchSetImpl<Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ): Result {
    // For the standard primitive atom pattern — atom(initialValue) —
    // the write function is: (get, set, nextValue) => set(self, nextValue)
    // We intercept via a proxy store.
    const proxy = makeBranchProxy();

    // Track whether the atom itself was written to during this call
    let selfWritten = false;

    const interceptingProxy: JotaiStore = {
      get: proxy.get,
      sub: proxy.sub,
      set: <V, A extends unknown[], R>(a: WritableAtom<V, A, R>, ...setArgs: A): R => {
        if ((a as unknown as Atom<unknown>) === (atom as unknown as Atom<unknown>)) {
          // Direct write to self — capture in Mutations_B
          const newValue = setArgs[0] as V;
          mutations.set(atom as unknown as Atom<unknown>, newValue);
          notifyAtom(atom as unknown as Atom<unknown>);
          selfWritten = true;
          return undefined as unknown as R;
        }
        // Write to another atom — recurse through the branch
        return branchSet(a, ...setArgs);
      },
    };

    const result = atom.write(interceptingProxy.get, interceptingProxy.set, ...args);

    if (!selfWritten) {
      // The write didn't touch self (e.g., a pure side-effect atom or async atom).
      // Fall back to the base store to honour the write semantics correctly.
      return baseStore.set(atom, ...args);
    }

    return result;
  };

  const branch: BranchStore = {
    get: branchGet,
    set: branchSet,

    sub(atom: Atom<unknown>, listener: Listener): Unsubscribe {
      if (!listeners.has(atom)) {
        listeners.set(atom, new Set());
      }
      listeners.get(atom)!.add(listener);

      ensureBaseSub(atom);

      return () => {
        const set = listeners.get(atom);
        if (set) {
          set.delete(listener);
          if (set.size === 0) {
            listeners.delete(atom);
            const unsub = baseSubs.get(atom);
            if (unsub) {
              unsub();
              baseSubs.delete(atom);
            }
          }
        }
      };
    },

    commit() {
      // Flush all local overrides to the base store
      for (const [atom, value] of mutations) {
        baseStore.set(
          atom as WritableAtom<unknown, [unknown], void>,
          value,
        );
      }
      mutations.clear();
      notifyAll();
    },

    discard() {
      mutations.clear();
      notifyAll();
    },

    has(atom: Atom<unknown>): boolean {
      return mutations.has(atom);
    },

    get size() {
      return mutations.size;
    },
  };

  return branch;
}
