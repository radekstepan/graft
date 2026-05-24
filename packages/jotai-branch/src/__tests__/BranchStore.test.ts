/**
 * BranchStore unit tests — no React required.
 *
 * Each test creates a fresh Jotai store and a branch on top of it.
 * We test the store's behaviour in isolation before layering React on top.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { atom, createStore } from 'jotai';
import { createBranchStore } from '../BranchStore';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBase() {
  return createStore();
}

function makeBranch(base = makeBase()) {
  return { base, branch: createBranchStore(base) };
}

// ── Read path ─────────────────────────────────────────────────────────────────

describe('get — read path', () => {
  it('falls through to base for unshadowed atoms', () => {
    const { base, branch } = makeBranch();
    const a = atom(42);
    base.set(a, 99);
    expect(branch.get(a)).toBe(99);
  });

  it('returns branch value when atom is locally overridden', () => {
    const { base, branch } = makeBranch();
    const a = atom(1);
    base.set(a, 10);
    branch.set(a, 77);
    expect(branch.get(a)).toBe(77);
  });

  it('returns initial value when neither base nor branch has been written', () => {
    const { branch } = makeBranch();
    const a = atom('hello');
    expect(branch.get(a)).toBe('hello');
  });
});

// ── Write path ────────────────────────────────────────────────────────────────

describe('set — write path', () => {
  it('does not write to base store', () => {
    const { base, branch } = makeBranch();
    const a = atom(0);
    branch.set(a, 5);
    expect(base.get(a)).toBe(0);   // base untouched
    expect(branch.get(a)).toBe(5); // branch has it
  });

  it('multiple writes accumulate in Mutations_B', () => {
    const { branch } = makeBranch();
    const a = atom(0);
    const b = atom('x');
    branch.set(a, 1);
    branch.set(b, 'y');
    expect(branch.size).toBe(2);
  });

  it('overwrites a previous branch value', () => {
    const { branch } = makeBranch();
    const a = atom(0);
    branch.set(a, 1);
    branch.set(a, 2);
    expect(branch.get(a)).toBe(2);
    expect(branch.size).toBe(1); // still only 1 override
  });

  it('notifies branch listeners on write', () => {
    const { branch } = makeBranch();
    const a = atom(0);
    const listener = vi.fn();
    branch.sub(a, listener);
    branch.set(a, 7);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

// ── commit() ─────────────────────────────────────────────────────────────────

describe('commit()', () => {
  it('flushes all mutations to the base store', () => {
    const { base, branch } = makeBranch();
    const a = atom(0);
    const b = atom('x');
    branch.set(a, 42);
    branch.set(b, 'z');
    branch.commit();
    expect(base.get(a)).toBe(42);
    expect(base.get(b)).toBe('z');
  });

  it('clears Mutations_B after commit', () => {
    const { branch } = makeBranch();
    const a = atom(0);
    branch.set(a, 1);
    expect(branch.size).toBe(1);
    branch.commit();
    expect(branch.size).toBe(0);
    expect(branch.has(a)).toBe(false);
  });

  it('notifies all branch listeners after commit', () => {
    const { branch } = makeBranch();
    const a = atom(0);
    const listener = vi.fn();
    branch.sub(a, listener);
    branch.set(a, 1);
    listener.mockClear();
    branch.commit();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('fires _onCommit callbacks', () => {
    const { branch } = makeBranch();
    const internal = branch as any;
    const cb = vi.fn();
    internal._onCommit.add(cb);
    branch.set(atom(0), 1);
    branch.commit();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('branch reads fall through to base after commit', () => {
    const { base, branch } = makeBranch();
    const a = atom(0);
    branch.set(a, 99);
    branch.commit();
    base.set(a, 55); // base value changes after commit
    expect(branch.get(a)).toBe(55); // branch has no override, falls through
  });
});

// ── discard() ─────────────────────────────────────────────────────────────────

describe('discard()', () => {
  it('clears Mutations_B without touching base', () => {
    const { base, branch } = makeBranch();
    const a = atom(0);
    base.set(a, 10);
    branch.set(a, 99);
    branch.discard();
    expect(base.get(a)).toBe(10);  // base unchanged
    expect(branch.get(a)).toBe(10); // branch falls through to base
    expect(branch.size).toBe(0);
  });

  it('notifies branch listeners after discard', () => {
    const { branch } = makeBranch();
    const a = atom(0);
    const listener = vi.fn();
    branch.sub(a, listener);
    branch.set(a, 1);
    listener.mockClear();
    branch.discard();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('fires _onDiscard callbacks', () => {
    const { branch } = makeBranch();
    const internal = branch as any;
    const cb = vi.fn();
    internal._onDiscard.add(cb);
    branch.set(atom(0), 1);
    branch.discard();
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

// ── reset(atom) ───────────────────────────────────────────────────────────────

describe('reset(atom)', () => {
  it('removes a single atom from Mutations_B', () => {
    const { branch } = makeBranch();
    const a = atom(0);
    const b = atom('x');
    branch.set(a, 1);
    branch.set(b, 'y');
    branch.reset(a);
    expect(branch.has(a)).toBe(false);
    expect(branch.has(b)).toBe(true); // b is still overridden
    expect(branch.size).toBe(1);
  });

  it('reverts atom to base value', () => {
    const { base, branch } = makeBranch();
    const a = atom(0);
    base.set(a, 5);
    branch.set(a, 99);
    branch.reset(a);
    expect(branch.get(a)).toBe(5);
  });

  it('notifies that atom\'s listeners', () => {
    const { branch } = makeBranch();
    const a = atom(0);
    const b = atom(0);
    const listenerA = vi.fn();
    const listenerB = vi.fn();
    branch.sub(a, listenerA);
    branch.sub(b, listenerB);
    branch.set(a, 1);
    branch.set(b, 2);
    listenerA.mockClear();
    listenerB.mockClear();
    branch.reset(a);
    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerB).not.toHaveBeenCalled(); // b unaffected
  });

  it('is a no-op when atom is not overridden', () => {
    const { branch } = makeBranch();
    const a = atom(0);
    const listener = vi.fn();
    branch.sub(a, listener);
    branch.reset(a); // not overridden — should not throw or notify
    expect(listener).not.toHaveBeenCalled();
  });

  it('fires _onDiscard callbacks', () => {
    const { branch } = makeBranch();
    const internal = branch as any;
    const cb = vi.fn();
    internal._onDiscard.add(cb);
    const a = atom(0);
    branch.set(a, 1);
    branch.reset(a);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

// ── getBaseValue() ────────────────────────────────────────────────────────────

describe('getBaseValue()', () => {
  it('always reads from base, even when atom is overridden', () => {
    const { base, branch } = makeBranch();
    const a = atom(0);
    base.set(a, 10);
    branch.set(a, 99);
    expect(branch.getBaseValue(a)).toBe(10);
    expect(branch.get(a)).toBe(99);
  });

  it('returns initial value when base has not been written', () => {
    const { branch } = makeBranch();
    const a = atom('initial');
    expect(branch.getBaseValue(a)).toBe('initial');
  });
});

// ── diff() ────────────────────────────────────────────────────────────────────

describe('diff()', () => {
  it('returns empty map when no overrides', () => {
    const { branch } = makeBranch();
    expect(branch.diff().size).toBe(0);
  });

  it('includes all overridden atoms with branch and base values', () => {
    const { base, branch } = makeBranch();
    const a = atom(0);
    const b = atom('x');
    base.set(a, 5);
    base.set(b, 'original');
    branch.set(a, 99);
    branch.set(b, 'draft');
    const d = branch.diff();
    expect(d.size).toBe(2);
    expect(d.get(a)).toEqual({ branch: 99, base: 5 });
    expect(d.get(b)).toEqual({ branch: 'draft', base: 'original' });
  });

  it('returns a stable snapshot (not live)', () => {
    const { branch } = makeBranch();
    const a = atom(0);
    branch.set(a, 1);
    const d1 = branch.diff();
    branch.set(a, 2); // mutate after snapshot
    const d2 = branch.diff();
    expect(d1.get(a)!.branch).toBe(1); // d1 is unchanged
    expect(d2.get(a)!.branch).toBe(2);
  });

  it('is empty after discard', () => {
    const { branch } = makeBranch();
    const a = atom(0);
    branch.set(a, 1);
    branch.discard();
    expect(branch.diff().size).toBe(0);
  });
});

// ── has() / size ──────────────────────────────────────────────────────────────

describe('has() and size', () => {
  it('has() returns false for unshadowed atoms', () => {
    const { branch } = makeBranch();
    const a = atom(0);
    expect(branch.has(a)).toBe(false);
  });

  it('has() returns true after set, false after reset', () => {
    const { branch } = makeBranch();
    const a = atom(0);
    branch.set(a, 1);
    expect(branch.has(a)).toBe(true);
    branch.reset(a);
    expect(branch.has(a)).toBe(false);
  });

  it('size reflects Mutations_B count', () => {
    const { branch } = makeBranch();
    expect(branch.size).toBe(0);
    const a = atom(0);
    const b = atom(1);
    branch.set(a, 1);
    expect(branch.size).toBe(1);
    branch.set(b, 2);
    expect(branch.size).toBe(2);
    branch.reset(a);
    expect(branch.size).toBe(1);
    branch.discard();
    expect(branch.size).toBe(0);
  });
});

// ── sub() / listener cleanup ──────────────────────────────────────────────────

describe('sub() — subscriptions', () => {
  it('unsubscribe stops notifications', () => {
    const { branch } = makeBranch();
    const a = atom(0);
    const listener = vi.fn();
    const unsub = branch.sub(a, listener);
    branch.set(a, 1);
    unsub();
    branch.set(a, 2);
    expect(listener).toHaveBeenCalledTimes(1); // called once before unsub
  });

  it('base-store updates pass through for unshadowed atoms', () => {
    const { base, branch } = makeBranch();
    const a = atom(0);
    const listener = vi.fn();
    branch.sub(a, listener);
    base.set(a, 7); // write to base
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('base-store updates are swallowed when atom is shadowed', () => {
    const { base, branch } = makeBranch();
    const a = atom(0);
    const listener = vi.fn();
    branch.sub(a, listener);
    branch.set(a, 5); // shadow it
    listener.mockClear();
    base.set(a, 99); // base changes — branch listener must NOT fire
    expect(listener).not.toHaveBeenCalled();
  });
});

// ── Derived atoms ─────────────────────────────────────────────────────────────

describe('derived atoms', () => {
  it('derived atom recalculates using branch overrides', () => {
    const { branch } = makeBranch();
    const nameAtom = atom('Alice');
    const greetAtom = atom((get) => `Hello, ${get(nameAtom)}!`);
    branch.set(nameAtom, 'Bob');
    expect(branch.get(greetAtom)).toBe('Hello, Bob!');
  });

  it('derived atom falls through to base when dependency is not overridden', () => {
    const { base, branch } = makeBranch();
    const countAtom = atom(0);
    const doubledAtom = atom((get) => get(countAtom) * 2);
    base.set(countAtom, 5);
    expect(branch.get(doubledAtom)).toBe(10);
  });
});

// ── _onMutation callbacks ─────────────────────────────────────────────────────

describe('_onMutation internal callbacks', () => {
  it('fires after every successful write to Mutations_B', () => {
    const { branch } = makeBranch();
    const internal = branch as any;
    const cb = vi.fn();
    internal._onMutation.add(cb);
    const a = atom(0);
    branch.set(a, 1);
    branch.set(a, 2);
    expect(cb).toHaveBeenCalledTimes(2);
  });
});
