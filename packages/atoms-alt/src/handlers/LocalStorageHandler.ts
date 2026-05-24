/**
 * Built-in handler: LocalStorage persistence.
 *
 * On read:  checks localStorage first; falls through to the chain on miss.
 * On write: delegates write down the chain, then syncs to localStorage.
 *
 * Storage key format: `atom:<atomName>`
 *
 * Only atoms whose values are JSON-serializable will work correctly.
 */
import type { StateHandler } from '../types';

export const LocalStorageHandler: StateHandler = {
  name: 'LocalStorage',

  read(atom, next) {
    try {
      const raw = localStorage.getItem(`atom:${atom.name}`);
      if (raw !== null) {
        return JSON.parse(raw) as ReturnType<typeof next>;
      }
    } catch {
      // Ignore parse errors — fall through to the chain.
    }
    return next(atom);
  },

  write(atom, value, next) {
    // Write to memory first so derived atoms see the new value immediately.
    next(atom, value);
    try {
      localStorage.setItem(`atom:${atom.name}`, JSON.stringify(value));
    } catch {
      // Quota exceeded or private browsing — silently swallow.
    }
  },
};
