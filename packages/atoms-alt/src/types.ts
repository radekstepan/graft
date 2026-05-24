/**
 * atoms-alt — Core types
 *
 * The key idea: Atoms are pure identity declarations. They carry no
 * side-effect logic. All behavior (persistence, validation, logging, etc.)
 * is injected at runtime through a composable handler stack.
 */

// ---------------------------------------------------------------------------
// Atom
// ---------------------------------------------------------------------------

/**
 * A Getter lets a derived atom read other atoms from the store.
 * The store injects its own `read` implementation here so derived atoms
 * automatically participate in the full handler chain.
 */
export type Getter = <V>(atom: Atom<V>) => V;

/**
 * An Atom is a pure declaration of identity and initial state.
 * It contains NO side-effect logic — all behavior comes from handlers.
 */
export interface Atom<T> {
  /** Unique identity — use the Symbol for O(1) map lookups. */
  readonly id: symbol;
  /** Human-readable name used by handlers for logging, storage keys, etc. */
  readonly name: string;
  /**
   * Compute the atom's value given a getter.
   * For primitive atoms this simply returns the initial value.
   * For derived atoms this calls `get` on dependencies.
   */
  readonly read: (get: Getter) => T;
}

// ---------------------------------------------------------------------------
// Handler stack
// ---------------------------------------------------------------------------

/**
 * `next` for a read operation — call to pass control down the chain.
 * Returns the resolved value (possibly from memory or a deeper handler).
 */
export type NextRead<T> = (atom: Atom<T>) => T;

/**
 * `next` for a write operation — call to pass control down the chain
 * so deeper handlers (or the base memory layer) perform the actual write.
 */
export type NextWrite<T> = (atom: Atom<T>, value: T) => void;

/**
 * A StateHandler is a composable middleware unit.
 *
 * Each handler may optionally intercept reads and/or writes.
 * Calling `next()` passes control to the next handler in the stack.
 * Not calling `next()` short-circuits the chain (useful for validation).
 *
 * Handlers are composed left-to-right: the first handler in the array
 * wraps the outermost layer; the last handler wraps just above the
 * base memory layer.
 */
export interface StateHandler {
  /** Debug name shown in dev-tools / logs. */
  name: string;
  /**
   * Intercept a read.
   * Can return a cached / persisted value, or call `next(atom)` to
   * delegate to the next handler in the stack.
   */
  read?: <T>(atom: Atom<T>, next: NextRead<T>) => T;
  /**
   * Intercept a write.
   * Can validate, log, persist, or call `next(atom, value)` to
   * delegate the actual write to the next handler in the stack.
   */
  write?: <T>(atom: Atom<T>, value: T, next: NextWrite<T>) => void;
}

// ---------------------------------------------------------------------------
// Subscriber types (for React integration)
// ---------------------------------------------------------------------------

export type Listener = () => void;
export type Unsubscribe = () => void;
