// Core
export { atom, derived } from './atom';
export { Store, createStore } from './Store';

// Types
export type {
  Atom,
  Getter,
  StateHandler,
  NextRead,
  NextWrite,
  Listener,
  Unsubscribe,
} from './types';

// Built-in handlers
export { LocalStorageHandler } from './handlers/LocalStorageHandler';
export { HistoryHandler } from './handlers/HistoryHandler';
export type { HistoryEntry } from './handlers/HistoryHandler';
export { ValidatorHandler } from './handlers/ValidatorHandler';
export type { ValidateFn, ValidationError } from './handlers/ValidatorHandler';

// React integration
export {
  StoreProvider,
  useStore,
  useAtom,
  useAtomValue,
  useSetAtom,
} from './react';
