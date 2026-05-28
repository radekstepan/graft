import React from 'react';
import { Provider } from 'jotai';
import type { BranchStore } from './types';

interface BranchProviderProps {
  branch: BranchStore;
  children: React.ReactNode;
}

/**
 * BranchProvider
 *
 * Wraps Jotai's <Provider store={branch}> so that all useAtom() calls inside
 * the subtree transparently read from and write to the branch store instead of
 * the global store — without any change to child components.
 *
 * @example
 * ```tsx
 * <BranchProvider branch={branch}>
 *   <ProfileForm />   // useAtom reads/writes go to the branch
 * </BranchProvider>
 * ```
 */
export function BranchProvider({ branch, children }: BranchProviderProps) {
  return (
    <Provider store={branch as Parameters<typeof Provider>[0]['store']}>
      {children}
    </Provider>
  );
}
