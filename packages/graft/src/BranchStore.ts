import type { Atom, WritableAtom } from 'jotai';
import type { BranchStore, BranchDiffEntry, JotaiStore, Listener, Unsubscribe } from './types';

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
 * Write path (primitive atoms):
 *   set(atom, value) → Mutations_B.set(atom, value) → notify branch listeners
 *
 * Write path (derived/writable atoms):
 *   atom.write() is called with a proxy store so self-writes land in Mutations_B;
 *   writes to other atoms recurse back through the branch.
 *
 * Subscribe path (useSyncExternalStore-compatible):
 *   sub(atom, listener):
 *     1. Register listener in branch listeners map
 *     2. Subscribe to base store for that atom
 *        → on base update: if atom NOT in Mutations_B, forward to branch listeners
 *        → if atom IS in Mutations_B, swallow (branch value shadows base)
 *
 * commit():
 *   For each (atom, value) in Mutations_B → baseStore.set(atom, value)
 *   Then clear Mutations_B + notify all branch listeners
 *
 * discard():
 *   Clear Mutations_B → notify all branch listeners (UI snaps to base values)
 *
 * reset(atom):
 *   Remove single atom from Mutations_B → notify that atom's branch listeners
 *
 * Lifecycle callbacks (internal, used by hooks):
 *   _onMutation — called after every successful write to Mutations_B
 *   _onCommit   — called after commit()
 *   _onDiscard  — called after discard() or reset()
 *
 * These are intentionally prefixed with _ to signal they are not part of the
 * public surface and are subject to change.
 */

/** @internal Extended type used by hooks that need to subscribe to branch events */
export interface BranchStoreInternal extends BranchStore {
  /** Called after any write that mutates Mutations_B */
  _onMutation: Set<() => void>;
  /** Called after commit() */
  _onCommit: Set<() => void>;
  /** Called after discard() or reset() */
  _onDiscard: Set<() => void>;
}

export function createBranchStore(baseStore: JotaiStore): BranchStore {
  // Local overrides: atom → value
  const mutations = new Map<Atom<unknown>, unknown>();

  // Per-atom branch subscribers
  const listeners = new Map<Atom<unknown>, Set<Listener>>();

  // Subscriptions held on the base store (one per atom ever subscribed)
  const baseSubs = new Map<Atom<unknown>, Unsubscribe>();

  // AbortControllers for in-flight async derived atom reads
  const readControllers = new Map<Atom<unknown>, AbortController>();

  // Lifecycle event sets (internal — used by useBranchStatus etc.)
  const onMutation = new Set<() => void>();
  const onCommit   = new Set<() => void>();
  const onDiscard  = new Set<() => void>();

  // ── Notification helpers ────────────────────────────────────────────────

  function notifyAtom(atom: Atom<unknown>): void {
    listeners.get(atom)?.forEach((fn) => fn());
  }

  function notifyAll(): void {
    for (const [atom] of listeners) notifyAtom(atom);
  }

  function fireMutation(): void {
    onMutation.forEach((fn) => fn());
  }

  function abortControllerFor(atom: Atom<unknown>): void {
    const controller = readControllers.get(atom);
    if (controller) {
      controller.abort();
      readControllers.delete(atom);
    }
  }

  function abortAllControllers(): void {
    for (const [, controller] of readControllers) {
      controller.abort();
    }
    readControllers.clear();
  }

  function normalizeAtomArg(
    atoms: Atom<unknown> | Atom<unknown>[] | undefined
  ): Atom<unknown>[] | undefined {
    if (atoms === undefined) return undefined;
    return Array.isArray(atoms) ? atoms : [atoms];
  }

  // ── Base-store subscription management ─────────────────────────────────

  /**
   * Ensure we hold a live subscription to the base store for this atom.
   * Forwards changes to branch listeners only when the atom is not shadowed.
   */
  function ensureBaseSub(atom: Atom<unknown>): void {
    if (baseSubs.has(atom)) return;

    const unsub = baseStore.sub(atom, () => {
      // If this atom is locally overridden, the branch value shadows the base.
      if (!mutations.has(atom)) notifyAtom(atom);
    });

    baseSubs.set(atom, unsub);
  }

  /**
   * Remove the base-store subscription for an atom (if present).
   * Called when the last branch listener for that atom unsubscribes,
   * or on full cleanup after commit/discard.
   */
  function removeBaseSub(atom: Atom<unknown>): void {
    const unsub = baseSubs.get(atom);
    if (unsub) {
      unsub();
      baseSubs.delete(atom);
    }
  }

  // ── Write implementation (forward-declared for recursion) ───────────────

  // eslint-disable-next-line prefer-const
  let branchSet: BranchStore['set'];

  /**
   * A proxy store passed to atom.write() so that the atom's own write
   * function routes reads and writes back through the branch.
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

    // 2. Jotai's read signature is always `(get: Getter) => Value`.
    //    For primitive atoms the getter argument is ignored — they return
    //    their stored value from the base store instead.  For derived atoms
    //    the getter IS called and must resolve through the branch so that
    //    overrides on dependencies are visible.
    //
    //    We can't call atom.read(branchGet) for primitives because that
    //    bypasses whatever the base store has recorded after explicit sets.
    //    Jotai exposes no public way to tell primitive vs. derived, but
    //    internally a primitive atom's `read` function has arity 1 and simply
    //    calls `get(self)` — so it DOES use the getter.  Calling it with
    //    branchGet would cause infinite recursion (branchGet → atom.read →
    //    get(self) → branchGet → …).
    //
    //    Jotai v2 primitive atoms have an `init` property. Derived atoms do
    //    not.  This is the most reliable distinguisher available without
    //    touching internals.
    //
    //    ⚠  IMPORTANT: This relies on an undocumented Jotai internal.  If
    //    Jotai v3 changes how primitive atoms are constructed (e.g. removes
    //    the `init` property), this heuristic will silently break and all
    //    atoms will be treated as derived.  A v3 migration MUST audit this
    //    check first.
    if ('init' in atom) {
      // Primitive atom — base store owns the stored value.
      return baseStore.get(atom);
    }

    // Derived atom — re-run the read function with branchGet as the Getter
    // so all dependency lookups resolve through the branch.
    // We provide a real AbortSignal so async atoms can cancel stale reads.
    const prevController = readControllers.get(atom as Atom<unknown>);
    if (prevController) {
      prevController.abort();
    }

    const controller = new AbortController();
    readControllers.set(atom as Atom<unknown>, controller);

    const setSelf =
      'write' in atom
        ? (...args: unknown[]) => {
            (
              atom as unknown as WritableAtom<unknown, unknown[], unknown>
            ).write(branchGet as any, branchSet as any, ...args);
          }
        : undefined;

    const result = atom.read(
      branchGet as Parameters<typeof atom.read>[0],
      { signal: controller.signal, setSelf } as Parameters<
        typeof atom.read
      >[1],
    );

    const isPromise =
      result != null && typeof (result as any).then === 'function';
    if (isPromise) {
      const onDone = () => {
        if (readControllers.get(atom as Atom<unknown>) === controller) {
          readControllers.delete(atom as Atom<unknown>);
        }
      };
      (result as unknown as Promise<unknown>).finally(onDone);
    } else {
      readControllers.delete(atom as Atom<unknown>);
    }

    return result;
  }

  branchSet = function branchSetImpl<Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ): Result {
    const proxy = makeBranchProxy();
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
          fireMutation();
          return undefined as unknown as R;
        }
        // Write to another atom — recurse through the branch
        return branchSet(a, ...setArgs);
      },
    };

    const result = atom.write(interceptingProxy.get, interceptingProxy.set, ...args);

    if (!selfWritten) {
      // The write didn't directly target self (e.g. a pure side-effect atom or
      // an atom whose write dispatches to multiple other atoms). Fall back to the
      // base store to honour the write semantics correctly.
      return baseStore.set(atom, ...args);
    }

    return result;
  };

  // ── Public API ──────────────────────────────────────────────────────────

  const branch: BranchStoreInternal = {
    // ── Internal lifecycle hooks (consumed by useBranchStatus etc.) ──────
    _onMutation: onMutation,
    _onCommit:   onCommit,
    _onDiscard:  onDiscard,

    // ── Store API ─────────────────────────────────────────────────────────
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
        if (!set) return;
        set.delete(listener);
        if (set.size === 0) {
          listeners.delete(atom);
          removeBaseSub(atom);
        }
      };
    },

    commit(...args: [] | [Atom<unknown>] | [Atom<unknown>[]]): void {
      const targets = args.length > 0 ? normalizeAtomArg(args[0]) : undefined;

      if (targets) {
        for (const a of targets) {
          if (!mutations.has(a)) continue;
          baseStore.set(
            a as WritableAtom<unknown, [unknown], void>,
            mutations.get(a),
          );
          mutations.delete(a);
          abortControllerFor(a);
          notifyAtom(a);
        }
      } else {
        for (const [atom, value] of mutations) {
          baseStore.set(
            atom as WritableAtom<unknown, [unknown], void>,
            value,
          );
        }
        mutations.clear();
        abortAllControllers();
        notifyAll();
      }
      onCommit.forEach((fn) => fn());
    },

    discard(...args: [] | [Atom<unknown>] | [Atom<unknown>[]]): void {
      const targets = args.length > 0 ? normalizeAtomArg(args[0]) : undefined;

      if (targets) {
        for (const a of targets) {
          if (!mutations.has(a)) continue;
          mutations.delete(a);
          abortControllerFor(a);
          notifyAtom(a);
        }
      } else {
        mutations.clear();
        abortAllControllers();
        notifyAll();
      }
      onDiscard.forEach((fn) => fn());
    },

    reset(atom: Atom<unknown>): void {
      if (!mutations.has(atom)) return;
      mutations.delete(atom);
      abortControllerFor(atom);
      notifyAtom(atom);
      onDiscard.forEach((fn) => fn());
    },

    getBaseValue<Value>(atom: Atom<Value>): Value {
      return baseStore.get(atom);
    },

    diff(): Map<Atom<unknown>, BranchDiffEntry> {
      const result = new Map<Atom<unknown>, BranchDiffEntry>();
      for (const [atom, branchValue] of mutations) {
        result.set(atom, {
          branch: branchValue,
          base: baseStore.get(atom as Atom<unknown>),
        });
      }
      return result;
    },

    has(atom: Atom<unknown>): boolean {
      return mutations.has(atom);
    },

    get size(): number {
      return mutations.size;
    },
  };

  return branch;
}
