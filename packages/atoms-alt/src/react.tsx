/**
 * React integration for atoms-alt.
 *
 * Provides:
 *   - StoreContext / StoreProvider  — make a Store available via Context
 *   - useStore                      — access the nearest Store
 *   - useAtom                       — [value, setter] tuple, subscribes to changes
 *   - useAtomValue                  — read-only subscription
 *   - useSetAtom                    — write-only setter (no subscription)
 */
import React, {
  createContext,
  useContext,
  useCallback,
  useSyncExternalStore,
} from 'react';
import type { Atom } from './types';
import { Store } from './Store';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const StoreContext = createContext<Store | null>(null);

export interface StoreProviderProps {
  store: Store;
  children: React.ReactNode;
}

/**
 * StoreProvider — wraps a subtree so that useAtom / useAtomValue / useSetAtom
 * will use the provided store instance.
 */
export function StoreProvider({ store, children }: StoreProviderProps): React.JSX.Element {
  return (
    <StoreContext.Provider value={store}>
      {children}
    </StoreContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// useStore
// ---------------------------------------------------------------------------

/**
 * Access the nearest Store from context.
 * Throws if called outside a <StoreProvider>.
 */
export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error(
      '[atoms-alt] useStore must be called inside a <StoreProvider>.'
    );
  }
  return store;
}

// ---------------------------------------------------------------------------
// useAtomValue
// ---------------------------------------------------------------------------

/**
 * Subscribe to an atom's value. Re-renders whenever the atom changes.
 * Read-only — use useAtom or useSetAtom to write.
 */
export function useAtomValue<T>(atom: Atom<T>): T {
  const store = useStore();

  const subscribe = useCallback(
    (listener: () => void) => store.subscribe(atom, listener),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, atom.id]
  );

  const getSnapshot = useCallback(
    () => store.read(atom),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, atom.id]
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ---------------------------------------------------------------------------
// useSetAtom
// ---------------------------------------------------------------------------

/**
 * Returns a stable setter for an atom.
 * Does NOT subscribe to the atom — use this when you only write.
 */
export function useSetAtom<T>(atom: Atom<T>): (value: T) => void {
  const store = useStore();
  return useCallback(
    (value: T) => store.write(atom, value),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, atom.id]
  );
}

// ---------------------------------------------------------------------------
// useAtom
// ---------------------------------------------------------------------------

/**
 * Returns [value, setter] — subscribes to the atom AND provides a setter.
 * Mirrors the Jotai useAtom signature for ergonomic familiarity.
 */
export function useAtom<T>(atom: Atom<T>): [T, (value: T) => void] {
  const value = useAtomValue(atom);
  const set = useSetAtom(atom);
  return [value, set];
}
