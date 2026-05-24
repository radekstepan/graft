/**
 * Demo 3: Nested Branches
 *
 * Demonstrates: nested BranchProviders with independent isolation.
 *
 * Structure:
 *   Global Store
 *   └─ Branch A (edits "title")
 *      └─ Branch B (edits "color")
 *
 * Each branch sees the combined state of everything above it,
 * but mutations only touch the immediate branch.
 *
 * commit() on B → flushes B's mutations to A (not global).
 * commit() on A → flushes A's (now containing B's committed values) to global.
 *
 * This models a "wizard" or "draft of a draft" pattern.
 */
import React from 'react';
import { atom, useAtom, useAtomValue } from 'jotai';
import { useBranch, BranchProvider } from 'jotai-branch';

// ─── Atoms ───────────────────────────────────────────────────────────────────

interface Config {
  title: string;
  color: string;
  count: number;
}

export const configAtom = atom<Config>({
  title: 'My Dashboard',
  color: '#8b5cf6',
  count: 42,
});

// ─── Value inspector ─────────────────────────────────────────────────────────

function ConfigInspector({ label }: { label: string }) {
  const config = useAtomValue(configAtom);
  return (
    <div className="value-display" style={{ fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4, fontSize: 11 }}>{label}</div>
      <div>title: <span style={{ color: 'var(--violet-bright)' }}>"{config.title}"</span></div>
      <div>color: <span style={{ color: config.color }}>{config.color}</span></div>
      <div>count: <span style={{ color: 'var(--cyan)' }}>{config.count}</span></div>
    </div>
  );
}

// ─── Branch B editor (innermost) ─────────────────────────────────────────────

function BranchBEditor({ branchA }: { branchA: ReturnType<typeof useBranch> }) {
  const branchB = useBranch();
  const [config, setConfig] = useAtom(configAtom);

  return (
    <div className="nest-layer layer-b" style={{ marginTop: '1rem' }}>
      <span className="nest-label">Branch B</span>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <ConfigInspector label="Branch B reads" />
        <div style={{ flex: 1 }}>
          <div className="field">
            <label htmlFor="nested-b-color">Color (Branch B)</label>
            <input
              id="nested-b-color"
              type="color"
              value={config.color}
              onChange={e => setConfig({ ...config, color: e.target.value })}
              style={{ height: 38, padding: 2 }}
            />
          </div>
          <div className="field">
            <label htmlFor="nested-b-count">Count (Branch B)</label>
            <input
              id="nested-b-count"
              type="number"
              value={config.count}
              onChange={e => setConfig({ ...config, count: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      <div className="btn-row" style={{ marginTop: 0 }}>
        <button
          id="nested-b-commit"
          className="btn btn-primary btn-sm"
          onClick={() => branchB.commit()}
          title="Flushes B's mutations into Branch A (not global)"
        >
          ↑ Commit B → A
        </button>
        <button
          id="nested-b-discard"
          className="btn btn-ghost btn-sm"
          onClick={() => branchB.discard()}
        >
          ✕ Discard B
        </button>
        <span className="badge badge-muted" style={{ marginLeft: 'auto' }}>
          {branchB.size} override{branchB.size !== 1 ? 's' : ''} in B
        </span>
      </div>
    </div>
  );
}

// ─── Branch A editor ─────────────────────────────────────────────────────────

function BranchAEditor() {
  const branchA = useBranch();
  const [config, setConfig] = useAtom(configAtom);

  return (
    <div className="nest-layer layer-a">
      <span className="nest-label">Branch A</span>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <ConfigInspector label="Branch A reads" />
        <div style={{ flex: 1 }}>
          <div className="field">
            <label htmlFor="nested-a-title">Title (Branch A)</label>
            <input
              id="nested-a-title"
              value={config.title}
              onChange={e => setConfig({ ...config, title: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Branch B nested inside Branch A */}
      <BranchProvider branch={branchA}>
        <BranchBEditor branchA={branchA} />
      </BranchProvider>

      <div className="btn-row">
        <button
          id="nested-a-commit"
          className="btn btn-primary btn-sm"
          onClick={() => branchA.commit()}
          title="Flushes A's accumulated mutations to the global store"
        >
          ↑ Commit A → Global
        </button>
        <button
          id="nested-a-discard"
          className="btn btn-ghost btn-sm"
          onClick={() => branchA.discard()}
        >
          ✕ Discard A
        </button>
        <span className="badge badge-violet" style={{ marginLeft: 'auto' }}>
          {branchA.size} override{branchA.size !== 1 ? 's' : ''} in A
        </span>
      </div>
    </div>
  );
}

// ─── Demo ────────────────────────────────────────────────────────────────────

export function NestedBranches() {
  const globalConfig = useAtomValue(configAtom);

  return (
    <section id="demo-nested">
      <div className="demo-header">
        <h1 className="demo-title">🌿 Nested Branches — Draft of a Draft</h1>
        <p className="demo-description">
          Branch A wraps Branch B. Each layer is fully isolated. Committing B
          flushes into A (not the global store). Only committing A reaches the
          global store. Models wizard flows, undo stacks, or staged approval workflows.
        </p>
      </div>

      <div className="cols-2">
        <div>
          <div className="nest-layer layer-global">
            <span className="nest-label">Global Store</span>
            <ConfigInspector label="Global state" />

            {/* Branch A injected as the store for its subtree */}
            <BranchAEditor />
          </div>
        </div>

        <div className="card">
          <div className="card-label">How it works</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <p style={{ marginBottom: '0.75rem' }}>
              <span className="badge badge-emerald">Global</span>{' '}
              The base Jotai store — only changes when Branch A commits.
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <span className="badge badge-violet">Branch A</span>{' '}
              Edits title. Sees global + its own overrides. Commits push to global.
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <span className="badge badge-muted" style={{ borderColor: 'rgba(34,211,238,0.3)', color: 'var(--cyan)' }}>Branch B</span>{' '}
              Edits color &amp; count. Sees global + A + its own overrides.
              Commits push only to A.
            </p>
            <div className="divider" />
            <p>
              Try: edit in B → Commit B → A → see A's inspector update. Then Commit A → Global.
            </p>
          </div>
          <div className="divider" />
          <div>
            <div className="card-label">Global store live view</div>
            <div className="value-display" style={{ fontSize: 12 }}>
              <div>title: <span style={{ color: 'var(--violet-bright)' }}>"{globalConfig.title}"</span></div>
              <div>color: <span style={{ color: globalConfig.color }}>{globalConfig.color}</span></div>
              <div>count: <span style={{ color: 'var(--cyan)' }}>{globalConfig.count}</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
