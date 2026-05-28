import { useRef } from 'react';
import { useStore } from 'jotai';
import { createBranchStore } from './BranchStore';
import type { BranchStore } from './types';

/**
 * useBranch()
 *
 * Creates a stable BranchStore linked to the nearest Jotai store in context
 * (either a <Provider store={...}> or the global default store).
 *
 * The branch is created once per component mount and is stable across re-renders.
 * It is NOT automatically discarded on unmount — you control its lifecycle via
 * branch.commit() and branch.discard().
 *
 * @example
 * ```tsx
 * function Editor() {
 *   const branch = useBranch();
 *
 *   return (
 *     <BranchProvider branch={branch}>
 *       <Form />
 *       <button onClick={branch.commit}>Save</button>
 *       <button onClick={branch.discard}>Cancel</button>
 *     </BranchProvider>
 *   );
 * }
 * ```
 */
export function useBranch(): BranchStore {
  const baseStore = useStore();
  const branchRef = useRef<BranchStore | null>(null);

  if (branchRef.current === null) {
    branchRef.current = createBranchStore(baseStore);
  }

  // eslint-disable-next-line react-hooks/refs -- intentional: branch is a stable singleton per mount
  return branchRef.current;
}
