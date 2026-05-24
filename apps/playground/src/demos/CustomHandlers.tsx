/**
 * Demo: Custom Handler — Rate Limiter + Audit Logger
 *
 * Shows how trivially you can create your own handler and slot it into the stack.
 * The RateLimiterHandler throttles writes per atom: if you write too fast
 * the write is dropped and a toast fires. No atom code changes needed.
 *
 * A second "Audit" handler logs writes and tallies reads, proving both sides
 * of the handler interface without causing setState-during-render loops.
 *
 * Why reads can't directly call setState:
 *   useSyncExternalStore calls getSnapshot (→ store.read) during React's render
 *   phase. Any setState triggered there causes an infinite re-render loop.
 *   Solution: accumulate reads in a plain ref; flush the tally to React state
 *   only when a write happens (which is always outside render).
 */
import React, { useState, useRef } from 'react';
import {
  atom,
  derived,
  createStore,
  StoreProvider,
  useAtom,
  useAtomValue,
} from 'atoms-alt';
import type { StateHandler } from 'atoms-alt';

// ─── Custom Handler 1: Rate Limiter ──────────────────────────────────────────

interface RateLimit {
  /** Minimum milliseconds between writes */
  ms: number;
  onDrop?: (atomName: string) => void;
}

function createRateLimiterHandler({ ms, onDrop }: RateLimit): StateHandler {
  const lastWrite = new Map<symbol, number>();
  return {
    name: 'RateLimiter',
    write(atom, value, next) {
      const now = Date.now();
      const last = lastWrite.get(atom.id) ?? 0;
      if (now - last < ms) {
        onDrop?.(atom.name);
        return; // Drop the write — do NOT call next()
      }
      lastWrite.set(atom.id, now);
      next(atom, value);
    },
  };
}

// ─── Custom Handler 2: Audit Logger ──────────────────────────────────────────
//
// Writes  → safe to surface immediately (event handlers, not render).
// Reads   → accumulate in a plain counter ref; exposed via getReadCount().
//           React state is updated only when a write flushes the counter,
//           breaking the render→read→setState→render cycle.

interface WriteEntry {
  atomName: string;
  value: unknown;
  ts: number;
}

interface AuditHandlerInstance extends StateHandler {
  /** Drain the pending read tally, resetting it to zero. */
  drainReadCount(): number;
  onWrite?: (entry: WriteEntry) => void;
}

function createAuditHandler(): AuditHandlerInstance {
  let pendingReads = 0;

  const handler: AuditHandlerInstance = {
    name: 'Audit',

    read(_atom, next) {
      // SAFE: increment a plain counter — no React state touched.
      pendingReads++;
      return next(_atom);
    },

    write(atom, value, next) {
      next(atom, value);
      // Fired from a user-event write handler — always outside render.
      handler.onWrite?.({ atomName: atom.name, value, ts: Date.now() });
    },

    drainReadCount() {
      const n = pendingReads;
      pendingReads = 0;
      return n;
    },
  };

  return handler;
}

// ─── Atoms ───────────────────────────────────────────────────────────────────

const temperatureAtom = atom(20, 'temperature');
const humidityAtom    = atom(50, 'humidity');
const heatIndexAtom   = derived((get) => {
  const t = get(temperatureAtom);
  const h = get(humidityAtom);
  return Math.round(t + 0.33 * (h / 100) * 6.105 - 4);
}, 'heatIndex');

// ─── Store setup ─────────────────────────────────────────────────────────────

function useCustomStore(rateMs: number) {
  const [drops, setDrops]         = useState<{ id: number; name: string }[]>([]);
  const [writes, setWrites]       = useState<WriteEntry[]>([]);
  const [totalReads, setTotalReads] = useState(0);
  const dropId   = useRef(0);
  const readAccum = useRef(0);  // running total of reads (updated outside React)

  const store = React.useMemo(() => {
    const auditor = createAuditHandler();

    // onWrite fires from user events (never during render) — setState is safe.
    auditor.onWrite = (entry) => {
      // Drain the read counter accumulated since the last write and add it
      // to our running total, then surface both to React state in one batch.
      const newReads = auditor.drainReadCount();
      readAccum.current += newReads;
      const snapshot = readAccum.current;

      setWrites((w) => [...w.slice(-9), entry]);
      setTotalReads(snapshot);
    };

    const rateLimiter = createRateLimiterHandler({
      ms: rateMs,
      // onDrop also fires from a write handler path — safe.
      onDrop: (name) =>
        setDrops((d) => [...d.slice(-4), { id: dropId.current++, name }]),
    });

    // Stack: Audit wraps RateLimiter — so Audit sees every attempted write,
    // RateLimiter decides whether it reaches memory.
    return createStore([auditor, rateLimiter]);
  // rateMs change rebuilds the store; auditor ref is captured fresh each time.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rateMs]);

  return { store, drops, writes, totalReads };
}

// ─── Sensor widget ───────────────────────────────────────────────────────────
//
// Local state controls the slider (always instant).
// Writes go to the atom — the rate limiter decides what the store accepts.
// This is the correct real-world pattern: UI stays responsive; the handler
// throttles only the side-effect (store commit), not the visual feedback.

function SensorSlider({
  id,
  label,
  unit,
  min,
  max,
  atomValue,    // last value accepted by the store
  onWrite,      // goes through the rate-limited store
}: {
  id: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  atomValue: number;
  onWrite: (v: number) => void;
}) {
  // Local draft — always tracks the slider handle position instantly.
  const [draft, setDraft] = useState(atomValue);
  const pending = draft !== atomValue;

  return (
    <div className="alt-sensor-block">
      <div className="alt-sensor-label">{label}</div>

      <div className="alt-sensor-values">
        {/* Slider position (local, instant) */}
        <span className="alt-sensor-draft">
          {draft}{unit}
          {pending && <span className="alt-sensor-pending-dot" title="pending" />}
        </span>
        {/* Store value (rate-limited) */}
        {pending && (
          <span className="alt-sensor-committed" title="last committed to store">
            store: {atomValue}{unit}
          </span>
        )}
      </div>

      <input
        type="range"
        id={id}
        min={min}
        max={max}
        value={draft}
        onChange={(e) => {
          const v = Number(e.target.value);
          setDraft(v);   // instant — local state only
          onWrite(v);    // may be dropped by the rate limiter
        }}
        className="alt-slider"
      />

      {/* Progress track showing committed vs. draft */}
      <div className="alt-sensor-track">
        <div
          className="alt-sensor-track-committed"
          style={{ width: `${((atomValue - min) / (max - min)) * 100}%` }}
        />
        <div
          className="alt-sensor-track-draft"
          style={{ width: `${((draft - min) / (max - min)) * 100}%` }}
        />
      </div>
    </div>
  );
}

function SensorPanel() {
  const [temp, setTemp]         = useAtom(temperatureAtom);
  const [humidity, setHumidity] = useAtom(humidityAtom);
  const heatIndex               = useAtomValue(heatIndexAtom);

  return (
    <div className="alt-widget">
      <div className="alt-sensor-grid">
        <SensorSlider
          id="temp-slider"
          label="Temperature (°C)"
          unit="°"
          min={-10}
          max={50}
          atomValue={temp}
          onWrite={setTemp}
        />
        <SensorSlider
          id="humidity-slider"
          label="Humidity (%)"
          unit="%"
          min={0}
          max={100}
          atomValue={humidity}
          onWrite={setHumidity}
        />
      </div>
      <div className="alt-heat-index">
        Heat Index (committed): <span>{heatIndex}°C</span>
      </div>
    </div>
  );
}


// ─── Demo shell ───────────────────────────────────────────────────────────────

export function CustomHandlers() {
  const [rateMs, setRateMs] = useState(500);
  const { store, drops, writes, totalReads } = useCustomStore(rateMs);

  return (
    <section id="demo-custom-handlers">
      <div className="demo-header">
        <h1 className="demo-title">🧩 Custom Handlers — Roll Your Own</h1>
        <p className="demo-description">
          Handlers are plain objects with a <code>read</code> and/or{' '}
          <code>write</code> method. A handler you write in 10 lines wraps
          every atom in the app — no per-atom wiring. Move the sliders to see
          the rate-limiter drop fast writes and the audit log capture each one.
        </p>
      </div>

      <div className="cols-2">
        {/* Controls */}
        <div className="card">
          <div className="card-label">Sensor controls</div>

          <div className="alt-field-row" style={{ marginBottom: '1rem' }}>
            <label htmlFor="rate-slider" className="alt-label">
              Rate limit: <strong>{rateMs === 0 ? 'off' : `${rateMs}ms`}</strong>
            </label>
            <input
              id="rate-slider"
              type="range"
              min={0}
              max={2000}
              step={100}
              value={rateMs}
              onChange={(e) => setRateMs(Number(e.target.value))}
              className="alt-slider"
            />
          </div>

          <StoreProvider store={store}>
            <SensorPanel />
          </StoreProvider>

          {drops.length > 0 && (
            <div className="alt-drops-panel">
              {drops.map((d) => (
                <div key={d.id} className="alt-drop-chip">
                  ⛔ write to <em>{d.name}</em> dropped
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit log */}
        <div className="card">
          <div className="card-label">Audit log</div>

          <div className="alt-audit-stats">
            <div className="alt-audit-stat">
              <div className="alt-audit-stat-value">{writes.length}</div>
              <div className="alt-audit-stat-label">writes logged</div>
            </div>
            <div className="alt-audit-stat">
              <div className="alt-audit-stat-value alt-audit-stat-reads">
                {totalReads}
              </div>
              <div className="alt-audit-stat-label">
                reads intercepted
                <span className="alt-audit-stat-note"> (tallied, not streamed)</span>
              </div>
            </div>
          </div>

          <div className="alt-history-panel" style={{ maxHeight: 260 }}>
            {writes.length === 0 ? (
              <div className="alt-history-empty">Move a slider to see entries…</div>
            ) : (
              [...writes].reverse().map((entry, i) => (
                <div key={i} className="alt-history-entry">
                  <span className="alt-op-badge alt-op-write">write</span>
                  <span className="alt-history-atom">{entry.atomName}</span>
                  <span className="alt-history-arrow">→</span>
                  <span className="alt-history-value">
                    {JSON.stringify(entry.value)}
                  </span>
                  <span className="alt-history-ts">
                    {new Date(entry.ts).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="alt-info-box alt-info-amber" style={{ marginTop: '1.5rem' }}>
        <span>💡</span>
        <span>
          <strong>Why reads show a tally, not a live stream:</strong>{' '}
          React calls <code>getSnapshot</code> (→ <code>store.read</code>) during
          render. Calling <code>setState</code> there — even deferred — triggers
          another render and an infinite loop. The read handler safely increments
          a plain counter; the count is flushed to React state only when a{' '}
          <em>write</em> event fires (which always originates from a user event,
          never from render).
        </span>
      </div>
    </section>
  );
}
