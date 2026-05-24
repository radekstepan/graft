import type { Atom, StateHandler, NextRead, NextWrite, Listener, Unsubscribe } from './types';

/**
 * Store — The effect interpreter.
 *
 * The Store holds actual state (a Map<symbol, any>) and compiles the
 * handler array into two composed chains: one for reads, one for writes.
 * The "base" of each chain is a direct read/write to the internal Map.
 *
 * Handlers are composed in an onion model:
 *   handlers[0]  ← outermost (first to intercept)
 *   handlers[n]  ← innermost (closest to raw memory)
 *   baseRead/baseWrite ← actual Map access
 *
 * The Store also implements a simple pub/sub mechanism so that React
 * (via useSyncExternalStore) and other subscribers can react to writes.
 */
export class Store {
  private values = new Map<symbol, unknown>();
  private listeners = new Map<symbol, Set<Listener>>();
  private readChain: NextRead<unknown>;
  private writeChain: NextWrite<unknown>;

  constructor(handlers: StateHandler[] = []) {
    // ── Base operations: direct Map access ────────────────────────────────
    const baseRead: NextRead<unknown> = (a) => {
      if (this.values.has(a.id)) {
        return this.values.get(a.id);
      }
      // Derived atoms: inject the store's own `read` as the Getter so that
      // derived atoms travel through the full handler chain too.
      return a.read((dep) => this.read(dep));
    };

    const baseWrite: NextWrite<unknown> = (a, v) => {
      this.values.set(a.id, v);
      this.notify(a);
    };

    // ── Compose handler chains (reduceRight = first handler is outermost) ─
    this.readChain = handlers.reduceRight<NextRead<unknown>>(
      (next, handler) =>
        (a) =>
          handler.read
            ? handler.read(a as Atom<unknown>, next as unknown as NextRead<unknown>)
            : next(a),
      baseRead
    );

    this.writeChain = handlers.reduceRight<NextWrite<unknown>>(
      (next, handler) =>
        (a, v) =>
          handler.write
            ? handler.write(a as Atom<unknown>, v, next as unknown as NextWrite<unknown>)
            : next(a, v),
      baseWrite
    );
  }

  // ── Public API ────────────────────────────────────────────────────────────

  read<T>(atom: Atom<T>): T {
    return this.readChain(atom as Atom<unknown>) as T;
  }

  write<T>(atom: Atom<T>, value: T): void {
    this.writeChain(atom as Atom<unknown>, value);
  }

  /**
   * Subscribe to changes for a specific atom.
   * Returns an unsubscribe function (compatible with useSyncExternalStore).
   */
  subscribe<T>(atom: Atom<T>, listener: Listener): Unsubscribe {
    if (!this.listeners.has(atom.id)) {
      this.listeners.set(atom.id, new Set());
    }
    const set = this.listeners.get(atom.id)!;
    set.add(listener);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(atom.id);
    };
  }

  /**
   * Subscribe to ALL atom changes (useful for devtools / logging panels).
   * The listener receives no atom identity — use only for global refresh.
   */
  subscribeAll(listener: Listener): Unsubscribe {
    // Use a synthetic sentinel key for the "all" listener bucket.
    const sentinel = Symbol('__all__');
    if (!this.listeners.has(sentinel)) {
      this.listeners.set(sentinel, new Set());
    }
    const set = this.listeners.get(sentinel)!;
    set.add(listener);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(sentinel);
    };
  }

  /**
   * Returns the number of atoms currently stored in memory.
   */
  get size(): number {
    return this.values.size;
  }

  /**
   * Clears all stored values (useful in tests or on sign-out).
   * Does NOT notify subscribers — use reset() for that.
   */
  clear(): void {
    this.values.clear();
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private notify(atom: Atom<unknown>): void {
    // Per-atom listeners
    this.listeners.get(atom.id)?.forEach((l) => l());
    // Global "all" listeners — find any sentinel sets
    for (const [key, set] of this.listeners) {
      if (typeof key === 'symbol' && key.description === '__all__') {
        set.forEach((l) => l());
      }
    }
  }
}

/**
 * createStore — convenience factory (mirrors Jotai's API shape).
 */
export function createStore(handlers: StateHandler[] = []): Store {
  return new Store(handlers);
}
