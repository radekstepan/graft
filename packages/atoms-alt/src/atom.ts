import type { Atom, Getter } from './types';

/**
 * atom() — Create a primitive atom.
 *
 * @param initialValue  The atom's default value when nothing has been written.
 * @param name          Human-readable name used by handlers (storage keys, logs, etc.)
 *
 * @example
 * const counterAtom = atom(0, 'counter');
 * const themeAtom   = atom<'light' | 'dark'>('light', 'theme');
 */
export function atom<T>(initialValue: T, name: string): Atom<T> {
  return {
    id: Symbol(name),
    name,
    read: () => initialValue,
  };
}

/**
 * derived() — Create a derived (computed) atom whose value is a pure
 * function of other atoms. Derived atoms are read-only.
 *
 * @param readFn  A function that receives a `get` getter and returns the
 *                derived value. This is re-evaluated whenever a dependency
 *                changes (when using the reactive React hooks).
 * @param name    Human-readable name for the derived atom.
 *
 * @example
 * const fullNameAtom = derived(
 *   get => `${get(firstNameAtom)} ${get(lastNameAtom)}`,
 *   'fullName'
 * );
 */
export function derived<T>(readFn: (get: Getter) => T, name: string): Atom<T> {
  return {
    id: Symbol(name),
    name,
    read: readFn,
  };
}
