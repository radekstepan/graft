// Core store
export { createBranchStore } from './BranchStore';

// Hooks
export { useBranch } from './useBranch';
export { useBranchStatus } from './useBranchStatus';
export { useBranchAtom, useBranchAtomValue, useSetBranchAtom } from './useBranchAtom';
export { useCommitOnUnmount, useDiscardOnUnmount } from './useCommitOnUnmount';

// Components
export { BranchProvider } from './BranchProvider';

// Types (public surface)
export type {
  BranchStore,
  BranchStatus,
  BranchDiffEntry,
  BranchProviderProps,
  JotaiStore,
  Listener,
  Unsubscribe,
} from './types';
