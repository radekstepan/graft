import React, { useSyncExternalStore } from 'react';
import type { BranchStore, BranchStatus } from './types';
import type { BranchStoreInternal } from './BranchStore';

/**
 * useBranchStatus
 *
 * Returns a live reactive snapshot of a branch's dirty state.
 * Re-renders whenever an atom is written, committed, or discarded.
 *
 * @example
 * ```tsx
 * function SaveBar() {
 *   const { isDirty, size, diff } = useBranchStatus(branch);
 *
 *   if (!isDirty) return null;
 *   return (
 *     <div>
 *       {size} change{size !== 1 ? 's' : ''} pending
 *       <button onClick={branch.commit}>Save</button>
 *       <button onClick={branch.discard}>Discard</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useBranchStatus(branch: BranchStore): BranchStatus {
  const internal = branch as BranchStoreInternal;

  // We must return a stable reference from getSnapshot, or useSyncExternalStore
  // will loop infinitely because Object.is({}, {}) is false.
  const snapshotRef = React.useRef<BranchStatus | null>(null);

  const subscribe = React.useCallback(
    (listener: () => void) => {
      const invalidateAndNotify = () => {
        snapshotRef.current = null;
        listener();
      };

      internal._onMutation.add(invalidateAndNotify);
      internal._onCommit.add(invalidateAndNotify);
      internal._onDiscard.add(invalidateAndNotify);
      
      return () => {
        internal._onMutation.delete(invalidateAndNotify);
        internal._onCommit.delete(invalidateAndNotify);
        internal._onDiscard.delete(invalidateAndNotify);
      };
    },
    [internal]
  );

  const getSnapshot = React.useCallback((): BranchStatus => {
    if (!snapshotRef.current) {
      snapshotRef.current = {
        isDirty: branch.size > 0,
        size: branch.size,
        diff: branch.diff(),
      };
    }
    return snapshotRef.current;
  }, [branch]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
