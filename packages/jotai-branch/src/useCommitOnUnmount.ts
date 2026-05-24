import { useEffect } from 'react';
import type { BranchStore } from './types';

/**
 * useCommitOnUnmount
 *
 * Calls `branch.commit()` when the component that owns the branch unmounts.
 *
 * Useful for "fire-and-forget" optimistic updates: mount a branch, render
 * optimistically, and commit automatically when the feature component is
 * removed from the tree.
 *
 * @example
 * ```tsx
 * function OptimisticFeature() {
 *   const branch = useBranch();
 *   useCommitOnUnmount(branch);
 *   // No need to call branch.commit() manually
 * }
 * ```
 */
export function useCommitOnUnmount(branch: BranchStore): void {
  useEffect(() => {
    return () => {
      branch.commit();
    };
  // branch is a stable ref — intentionally no dependency array entry
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * useDiscardOnUnmount
 *
 * Calls `branch.discard()` when the component unmounts.
 *
 * The canonical pattern for optimistic UI with rollback: apply changes to
 * the branch, await the network call, call `branch.commit()` on success,
 * or simply unmount and let this hook roll back automatically on failure.
 *
 * @example
 * ```tsx
 * function OptimisticRow({ todoAtom }: Props) {
 *   const branch = useBranch();
 *   useDiscardOnUnmount(branch); // auto-rollback if we unmount before committing
 *
 *   const [todo, setTodo] = useBranchAtom(todoAtom, branch);
 *
 *   const save = async () => {
 *     setTodo({ ...todo, done: true }); // optimistic
 *     try {
 *       await api.save(todo.id);
 *       branch.commit();
 *     } catch {
 *       branch.discard(); // or just unmount — the hook covers it
 *     }
 *   };
 * }
 * ```
 */
export function useDiscardOnUnmount(branch: BranchStore): void {
  useEffect(() => {
    return () => {
      branch.discard();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
