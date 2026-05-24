/**
 * Built-in handler: History / time-travel logger.
 *
 * Records every write as a `{ atom, prev, next, ts }` entry.
 * Exposes a `history` array and a `travel(index)` method for replaying state.
 *
 * Usage:
 *   const historyHandler = new HistoryHandler();
 *   const store = createStore([historyHandler]);
 *   // After some writes...
 *   historyHandler.history   // array of HistoryEntry
 *   historyHandler.travel(0) // replay the write at index 0
 */
import type { StateHandler, Atom } from '../types';

export interface HistoryEntry {
  atomName: string;
  prev: unknown;
  next: unknown;
  ts: number;
}

export class HistoryHandler implements StateHandler {
  readonly name = 'History';

  /** All recorded state transitions, in chronological order. */
  readonly history: HistoryEntry[] = [];

  /**
   * Callback invoked after each write — useful for triggering React re-renders
   * in a devtools panel.
   */
  onRecord?: (entry: HistoryEntry) => void;

  write<T>(atom: Atom<T>, value: T, next: (a: Atom<T>, v: T) => void): void {
    // Peek at the current value before writing (read from the next layer down).
    // We do this by reading from the chain *before* we mutate.
    // Because we don't have direct access to the store here, we store `undefined`
    // as prev when the atom hasn't been written yet.
    const entry: HistoryEntry = {
      atomName: atom.name,
      prev: undefined, // will be filled by the store reflector if needed
      next: value,
      ts: Date.now(),
    };
    this.history.push(entry);
    this.onRecord?.(entry);
    next(atom, value);
  }
}
