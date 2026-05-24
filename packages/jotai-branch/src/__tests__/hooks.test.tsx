/**
 * React integration tests for jotai-branch hooks.
 *
 * Uses @testing-library/react + jsdom (configured in vitest.config.ts).
 * Each test renders minimal components that exercise a specific hook contract.
 */
import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { atom, Provider, useAtom, useAtomValue } from 'jotai';
import { createStore as createJotaiStore } from 'jotai';

import { createBranchStore } from '../BranchStore';
import { useBranch } from '../useBranch';
import { useBranchStatus } from '../useBranchStatus';
import { useBranchAtom, useBranchAtomValue } from '../useBranchAtom';
import { useCommitOnUnmount, useDiscardOnUnmount } from '../useCommitOnUnmount';
import { BranchProvider } from '../BranchProvider';

// ── Test atoms ────────────────────────────────────────────────────────────────

const nameAtom = atom('Alice');
const countAtom = atom(0);
const doubledAtom = atom((get) => get(countAtom) * 2);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Renders children inside a fresh Jotai Provider with an isolated store */
function JotaiRoot({
  children,
  store,
}: {
  children: React.ReactNode;
  store?: ReturnType<typeof createJotaiStore>;
}) {
  return <Provider store={store}>{children}</Provider>;
}

// ── useBranch ─────────────────────────────────────────────────────────────────

describe('useBranch()', () => {
  it('creates a branch linked to the nearest Jotai store', () => {
    const baseStore = createJotaiStore();
    baseStore.set(nameAtom, 'Base');

    let capturedBranch: ReturnType<typeof createBranchStore> | null = null;

    function Comp() {
      const branch = useBranch();
      capturedBranch = branch as any;
      return null;
    }

    render(<JotaiRoot store={baseStore}><Comp /></JotaiRoot>);
    expect(capturedBranch).not.toBeNull();
    expect(capturedBranch!.get(nameAtom)).toBe('Base');
  });

  it('returns the same branch instance on re-render', () => {
    const refs: object[] = [];

    function Comp() {
      const [, setTick] = useState(0);
      const branch = useBranch();
      refs.push(branch);
      return <button onClick={() => setTick((t) => t + 1)}>tick</button>;
    }

    render(<JotaiRoot><Comp /></JotaiRoot>);
    act(() => screen.getByRole('button').click());
    expect(refs[0]).toBe(refs[1]); // same reference
  });
});

// ── BranchProvider ────────────────────────────────────────────────────────────

describe('<BranchProvider>', () => {
  it('redirects useAtom reads to the branch', async () => {
    const baseStore = createJotaiStore();
    baseStore.set(countAtom, 10);

    function Inner() {
      const [count] = useAtom(countAtom);
      return <span data-testid="val">{count}</span>;
    }

    function Outer() {
      const branch = useBranch();
      // Write to branch only
      React.useLayoutEffect(() => { branch.set(countAtom, 99); }, [branch]);
      return (
        <BranchProvider branch={branch}>
          <Inner />
        </BranchProvider>
      );
    }

    render(<JotaiRoot store={baseStore}><Outer /></JotaiRoot>);
    await waitFor(() =>
      expect(screen.getByTestId('val').textContent).toBe('99')
    );
  });

  it('redirects useAtom writes to the branch, not the base', async () => {
    const baseStore = createJotaiStore();

    function Inner() {
      const [, setCount] = useAtom(countAtom);
      return <button onClick={() => setCount(42)}>write</button>;
    }

    function Outer() {
      const branch = useBranch();
      return (
        <BranchProvider branch={branch}>
          <Inner />
        </BranchProvider>
      );
    }

    render(<JotaiRoot store={baseStore}><Outer /></JotaiRoot>);
    await userEvent.click(screen.getByRole('button'));
    expect(baseStore.get(countAtom)).toBe(0); // base untouched
  });
});

// ── useBranchStatus ───────────────────────────────────────────────────────────

describe('useBranchStatus()', () => {
  it('reports isDirty=false initially', () => {
    function Comp() {
      const branch = useBranch();
      const { isDirty } = useBranchStatus(branch);
      return <span data-testid="dirty">{String(isDirty)}</span>;
    }

    render(<JotaiRoot><Comp /></JotaiRoot>);
    expect(screen.getByTestId('dirty').textContent).toBe('false');
  });

  it('reports isDirty=true after a write', async () => {
    function Comp() {
      const branch = useBranch();
      const { isDirty, size } = useBranchStatus(branch);
      return (
        <>
          <span data-testid="dirty">{String(isDirty)}</span>
          <span data-testid="size">{size}</span>
          <button onClick={() => branch.set(countAtom, 5)}>write</button>
        </>
      );
    }

    render(<JotaiRoot><Comp /></JotaiRoot>);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('dirty').textContent).toBe('true');
    expect(screen.getByTestId('size').textContent).toBe('1');
  });

  it('returns to isDirty=false after discard', async () => {
    function Comp() {
      const branch = useBranch();
      const { isDirty } = useBranchStatus(branch);
      return (
        <>
          <span data-testid="dirty">{String(isDirty)}</span>
          <button data-testid="write" onClick={() => branch.set(countAtom, 5)}>write</button>
          <button data-testid="discard" onClick={() => branch.discard()}>discard</button>
        </>
      );
    }

    render(<JotaiRoot><Comp /></JotaiRoot>);
    await userEvent.click(screen.getByTestId('write'));
    expect(screen.getByTestId('dirty').textContent).toBe('true');
    await userEvent.click(screen.getByTestId('discard'));
    expect(screen.getByTestId('dirty').textContent).toBe('false');
  });

  it('returns to isDirty=false after commit', async () => {
    function Comp() {
      const branch = useBranch();
      const { isDirty } = useBranchStatus(branch);
      return (
        <>
          <span data-testid="dirty">{String(isDirty)}</span>
          <button data-testid="write" onClick={() => branch.set(countAtom, 5)}>write</button>
          <button data-testid="commit" onClick={() => branch.commit()}>commit</button>
        </>
      );
    }

    render(<JotaiRoot><Comp /></JotaiRoot>);
    await userEvent.click(screen.getByTestId('write'));
    await userEvent.click(screen.getByTestId('commit'));
    expect(screen.getByTestId('dirty').textContent).toBe('false');
  });

  it('diff includes overridden atoms with base and branch values', async () => {
    const baseStore = createJotaiStore();
    baseStore.set(countAtom, 7);

    let lastDiff: Map<any, any> = new Map();

    function Comp() {
      const branch = useBranch();
      const status = useBranchStatus(branch);
      lastDiff = status.diff;
      return (
        <button onClick={() => branch.set(countAtom, 99)}>write</button>
      );
    }

    render(<JotaiRoot store={baseStore}><Comp /></JotaiRoot>);
    await userEvent.click(screen.getByRole('button'));
    expect(lastDiff.get(countAtom)).toEqual({ branch: 99, base: 7 });
  });
});

// ── useBranchAtom ─────────────────────────────────────────────────────────────

describe('useBranchAtom()', () => {
  it('reads from the branch store', () => {
    const baseStore = createJotaiStore();
    baseStore.set(countAtom, 10);
    const branch = createBranchStore(baseStore);
    branch.set(countAtom, 55);

    function Comp() {
      const [val] = useBranchAtom(countAtom, branch);
      return <span data-testid="val">{val}</span>;
    }

    render(<JotaiRoot store={baseStore}><Comp /></JotaiRoot>);
    expect(screen.getByTestId('val').textContent).toBe('55');
  });

  it('writes to the branch store, not base', async () => {
    const baseStore = createJotaiStore();
    const branch = createBranchStore(baseStore);

    function Comp() {
      const [, set] = useBranchAtom(countAtom, branch);
      return <button onClick={() => set(42)}>write</button>;
    }

    render(<JotaiRoot store={baseStore}><Comp /></JotaiRoot>);
    await userEvent.click(screen.getByRole('button'));
    expect(baseStore.get(countAtom)).toBe(0);
    expect(branch.get(countAtom)).toBe(42);
  });
});

// ── useBranchAtomValue ────────────────────────────────────────────────────────

describe('useBranchAtomValue()', () => {
  it('returns branch value for an overridden atom', () => {
    const baseStore = createJotaiStore();
    const branch = createBranchStore(baseStore);
    branch.set(nameAtom, 'Branch Alice');

    function Comp() {
      const name = useBranchAtomValue(nameAtom, branch);
      return <span data-testid="name">{name}</span>;
    }

    render(<JotaiRoot store={baseStore}><Comp /></JotaiRoot>);
    expect(screen.getByTestId('name').textContent).toBe('Branch Alice');
  });
});

// ── useCommitOnUnmount ────────────────────────────────────────────────────────

describe('useCommitOnUnmount()', () => {
  it('commits the branch when the component unmounts', async () => {
    const baseStore = createJotaiStore();

    function Child() {
      const branch = useBranch();
      useCommitOnUnmount(branch);
      React.useLayoutEffect(() => { branch.set(countAtom, 77); }, [branch]);
      return <span>child</span>;
    }

    function Parent() {
      const [show, setShow] = useState(true);
      return (
        <>
          {show && <Child />}
          <button onClick={() => setShow(false)}>unmount</button>
        </>
      );
    }

    render(<JotaiRoot store={baseStore}><Parent /></JotaiRoot>);
    await userEvent.click(screen.getByRole('button'));
    expect(baseStore.get(countAtom)).toBe(77); // committed on unmount
  });
});

// ── useDiscardOnUnmount ───────────────────────────────────────────────────────

describe('useDiscardOnUnmount()', () => {
  it('discards the branch when the component unmounts', async () => {
    const baseStore = createJotaiStore();

    function Child() {
      const branch = useBranch();
      useDiscardOnUnmount(branch);
      React.useLayoutEffect(() => { branch.set(countAtom, 77); }, [branch]);
      return <span>child</span>;
    }

    function Parent() {
      const [show, setShow] = useState(true);
      return (
        <>
          {show && <Child />}
          <button onClick={() => setShow(false)}>unmount</button>
        </>
      );
    }

    render(<JotaiRoot store={baseStore}><Parent /></JotaiRoot>);
    await userEvent.click(screen.getByRole('button'));
    expect(baseStore.get(countAtom)).toBe(0); // discard on unmount — base untouched
  });
});

// ── Nested branches ───────────────────────────────────────────────────────────

describe('Nested branches', () => {
  it('inner branch overrides shadow outer branch values', () => {
    const baseStore = createJotaiStore();
    baseStore.set(countAtom, 1);

    const outerBranch = createBranchStore(baseStore);
    outerBranch.set(countAtom, 10);

    const innerBranch = createBranchStore(outerBranch as any);
    innerBranch.set(countAtom, 99);

    // Inner branch reads its own override
    expect(innerBranch.get(countAtom)).toBe(99);
    // Outer branch is unaffected
    expect(outerBranch.get(countAtom)).toBe(10);
    // Base is unaffected
    expect(baseStore.get(countAtom)).toBe(1);
  });

  it('inner branch falls through to outer branch for unshadowed atoms', () => {
    const baseStore = createJotaiStore();
    baseStore.set(countAtom, 1);

    const outerBranch = createBranchStore(baseStore);
    outerBranch.set(nameAtom, 'Outer');

    const innerBranch = createBranchStore(outerBranch as any);
    // nameAtom not overridden in inner — should fall through to outer
    expect(innerBranch.get(nameAtom)).toBe('Outer');
  });
});

// ── Derived atoms in branch context ───────────────────────────────────────────

describe('Derived atoms inside <BranchProvider>', () => {
  it('derived atom recalculates from branch overrides', async () => {
    const baseStore = createJotaiStore();

    function Inner() {
      const [count] = useAtom(countAtom);
      const doubled = useAtomValue(doubledAtom);
      return (
        <>
          <span data-testid="count">{count}</span>
          <span data-testid="doubled">{doubled}</span>
        </>
      );
    }

    function Outer() {
      const branch = useBranch();
      React.useLayoutEffect(() => { branch.set(countAtom, 7); }, [branch]);
      return (
        <BranchProvider branch={branch}>
          <Inner />
        </BranchProvider>
      );
    }

    render(<JotaiRoot store={baseStore}><Outer /></JotaiRoot>);
    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('7');
      expect(screen.getByTestId('doubled').textContent).toBe('14');
    });
  });
});
