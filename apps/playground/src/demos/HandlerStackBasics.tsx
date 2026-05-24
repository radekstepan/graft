/**
 * Demo: Handler Stack Basics
 *
 * Demonstrates the core atoms-alt concept: atoms as pure declarations,
 * behavior injected via a composable handler stack.
 *
 * Shows three Stores side-by-side:
 *   1. Plain store (just memory)
 *   2. Store + LocalStorage persistence
 *   3. Store + Validation + History
 *
 * The atom definitions are IDENTICAL in all three — only the Store changes.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  atom,
  derived,
  createStore,
  StoreProvider,
  useAtom,
  useAtomValue,
  LocalStorageHandler,
  ValidatorHandler,
  HistoryHandler,
} from 'atoms-alt';
import type { HistoryEntry } from 'atoms-alt';

// ─── Atoms (defined once, used in all three stores) ──────────────────────────

const countAtom = atom(0, 'counter');
const labelAtom = atom('clicks', 'label');
const doubledAtom = derived((get) => get(countAtom) * 2, 'doubled');
const summaryAtom = derived(
  (get) => `${get(countAtom)} ${get(labelAtom)} (×2 = ${get(doubledAtom)})`,
  'summary'
);

// ─── Shared inner UI (same component across all three stores) ─────────────────

function CounterWidget({ id }: { id: string }) {
  const [count, setCount] = useAtom(countAtom);
  const [label, setLabel] = useAtom(labelAtom);
  const doubled = useAtomValue(doubledAtom);
  const summary = useAtomValue(summaryAtom);

  return (
    <div className="alt-widget">
      <div className="alt-counter-display">
        <span className="alt-counter-value">{count}</span>
        <span className="alt-counter-label">{label}</span>
      </div>

      <div className="alt-counter-doubled">
        doubled → <strong>{doubled}</strong>
      </div>

      <div className="alt-counter-summary">{summary}</div>

      <div className="alt-btn-row">
        <button
          id={`${id}-dec`}
          className="alt-btn alt-btn-ghost"
          onClick={() => setCount(count - 1)}
        >
          −
        </button>
        <button
          id={`${id}-inc`}
          className="alt-btn alt-btn-primary"
          onClick={() => setCount(count + 1)}
        >
          +
        </button>
        <button
          id={`${id}-reset`}
          className="alt-btn alt-btn-ghost"
          onClick={() => { setCount(0); setLabel('clicks'); }}
        >
          ↺
        </button>
      </div>

      <div className="alt-field-row">
        <label htmlFor={`${id}-label`} className="alt-label">Label</label>
        <input
          id={`${id}-label`}
          className="alt-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── Store 1: Plain in-memory ─────────────────────────────────────────────────

const plainStore = createStore([]);

function PlainStoreDemo() {
  return (
    <StoreProvider store={plainStore}>
      <CounterWidget id="plain" />
      <div className="alt-info-box alt-info-blue">
        <span>📦</span>
        <span>Just memory. No persistence, no validation, no logging.</span>
      </div>
    </StoreProvider>
  );
}

// ─── Store 2: LocalStorage persistence ───────────────────────────────────────

const persistStore = createStore([LocalStorageHandler]);

function PersistStoreDemo() {
  return (
    <StoreProvider store={persistStore}>
      <CounterWidget id="persist" />
      <div className="alt-info-box alt-info-emerald">
        <span>💾</span>
        <span>
          Writes sync to <code>localStorage</code> automatically. Refresh the
          page — the count survives.
        </span>
      </div>
    </StoreProvider>
  );
}

// ─── Store 3: Validation + History ───────────────────────────────────────────

const validator = new ValidatorHandler();
validator.register(countAtom, (v) =>
  v < -10 || v > 10 ? `Counter must be between -10 and 10 (got ${v})` : null
);
const historyHandler = new HistoryHandler();
const validatedStore = createStore([historyHandler, validator]);

function ValidatedHistoryDemo() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [rejection, setRejection] = useState<string | null>(null);
  const rejTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    historyHandler.onRecord = (entry) => {
      setHistory((h) => [...h.slice(-8), entry]);
    };
    validator.onReject = (err) => {
      setRejection(err.error);
      if (rejTimeout.current) clearTimeout(rejTimeout.current);
      rejTimeout.current = setTimeout(() => setRejection(null), 3000);
    };
    return () => {
      historyHandler.onRecord = undefined;
      validator.onReject = undefined;
    };
  }, []);

  return (
    <StoreProvider store={validatedStore}>
      <CounterWidget id="validated" />

      {rejection && (
        <div className="alt-info-box alt-info-red">
          <span>⛔</span>
          <span>{rejection}</span>
        </div>
      )}

      {history.length > 0 && (
        <div className="alt-history-panel">
          <div className="alt-history-title">History log</div>
          {[...history].reverse().map((entry, i) => (
            <div key={i} className="alt-history-entry">
              <span className="alt-history-atom">{entry.atomName}</span>
              <span className="alt-history-arrow">→</span>
              <span className="alt-history-value">
                {JSON.stringify(entry.next)}
              </span>
              <span className="alt-history-ts">
                {new Date(entry.ts).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="alt-info-box alt-info-violet">
        <span>🛡️</span>
        <span>
          Counter is validated to <code>−10…10</code>. Every write is logged.
          The <strong>same atom definitions</strong> power all three stores.
        </span>
      </div>
    </StoreProvider>
  );
}

// ─── Demo shell ───────────────────────────────────────────────────────────────

export function HandlerStackBasics() {
  return (
    <section id="demo-handler-stack">
      <div className="demo-header">
        <h1 className="demo-title">🔧 Handler Stack — Atoms as Pure Keys</h1>
        <p className="demo-description">
          The atom definitions are <strong>identical</strong> across all three
          columns. Only the Store changes. Behavior — persistence, validation,
          logging — is injected at runtime through a composable handler chain.
          This is the core insight of atoms-alt.
        </p>
      </div>

      <div className="alt-handler-grid">
        <div className="card">
          <div className="card-label">① Plain store</div>
          <div className="alt-stack-badge alt-stack-badge-blue">
            <code>createStore([])</code>
          </div>
          <PlainStoreDemo />
        </div>

        <div className="card">
          <div className="card-label">② LocalStorage persistence</div>
          <div className="alt-stack-badge alt-stack-badge-emerald">
            <code>createStore([LocalStorageHandler])</code>
          </div>
          <PersistStoreDemo />
        </div>

        <div className="card">
          <div className="card-label">③ Validation + History</div>
          <div className="alt-stack-badge alt-stack-badge-violet">
            <code>createStore([HistoryHandler, ValidatorHandler])</code>
          </div>
          <ValidatedHistoryDemo />
        </div>
      </div>

      <div className="alt-info-box alt-info-amber" style={{ marginTop: '1.5rem' }}>
        <span>💡</span>
        <span>
          <strong>Key insight:</strong> In Jotai you'd write{' '}
          <code>atomWithStorage(atomWithValidate(atom(0)))</code> — mixing
          identity with behavior. Here the atom stays pure:{' '}
          <code>atom(0, 'counter')</code>. The <em>environment</em> dictates
          effects.
        </span>
      </div>
    </section>
  );
}
