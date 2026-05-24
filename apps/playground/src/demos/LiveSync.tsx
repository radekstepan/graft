/**
 * Demo 4: Live Sync
 *
 * Demonstrates: how the branch handles live background mutations to the base store.
 *
 * A background timer ticks every 1.5s, randomly incrementing atoms in the global store.
 * When a branch overrides an atom, it "shadows" that atom — base store updates for it
 * are intercepted and NOT forwarded to the branch subscribers.
 * When an atom is NOT overridden, the branch forwards base store updates transparently.
 *
 * This models the "active form while the world keeps moving" pattern:
 * - Fields the user has touched → frozen in the branch
 * - Fields the user hasn't touched → continue to receive live global updates
 */
import React, { useEffect, useRef, useState } from 'react';
import { atom, useAtom, useAtomValue } from 'jotai';
import { useBranch, BranchProvider } from 'jotai-branch';

// ─── Atoms (a small "metrics dashboard") ─────────────────────────────────────

export const cpuAtom     = atom(23);
export const memAtom     = atom(61);
export const diskAtom    = atom(44);
export const networkAtom = atom(8);

const ALL_ATOMS = [
  { id: 'cpu',     label: 'CPU %',        a: cpuAtom     },
  { id: 'mem',     label: 'Memory %',     a: memAtom     },
  { id: 'disk',    label: 'Disk %',       a: diskAtom    },
  { id: 'network', label: 'Network MB/s', a: networkAtom },
] as const;

// ─── Background ticker ───────────────────────────────────────────────────────

function useGlobalTicker(running: boolean) {
  const [, setCpu]     = useAtom(cpuAtom);
  const [, setMem]     = useAtom(memAtom);
  const [, setDisk]    = useAtom(diskAtom);
  const [, setNetwork] = useAtom(networkAtom);

  useEffect(() => {
    if (!running) return;
    const setters = [setCpu, setMem, setDisk, setNetwork];

    const id = setInterval(() => {
      const count = Math.random() > 0.5 ? 2 : 1;
      const idxs = Array.from({ length: count }, () => Math.floor(Math.random() * 4));
      for (const idx of idxs) {
        const setter = setters[idx]!;
        setter(prev => Math.max(1, Math.min(99, prev + Math.floor((Math.random() - 0.4) * 12))));
      }
    }, 1500);

    return () => clearInterval(id);
  }, [running, setCpu, setMem, setDisk, setNetwork]);
}

// ─── Metric card ─────────────────────────────────────────────────────────────

interface MetricCardProps {
  id: string;
  label: string;
  branchValue: number;
  globalValue: number;
  isShadowed: boolean;
  onPin: (v: number) => void;
  onUnpin: () => void;
}

function MetricCard({ id, label, branchValue, globalValue, isShadowed, onPin, onUnpin }: MetricCardProps) {
  const [flashKey, setFlashKey] = useState(0);
  const prevGlobal = useRef(globalValue);

  useEffect(() => {
    if (globalValue !== prevGlobal.current) {
      prevGlobal.current = globalValue;
      if (!isShadowed) setFlashKey(k => k + 1);
    }
  }, [globalValue, isShadowed]);

  const barColor = isShadowed ? 'var(--violet)' : 'var(--emerald)';

  return (
    <div
      key={flashKey}
      id={`livesync-card-${id}`}
      className={`sync-atom${isShadowed ? ' shadowed' : ''}${flashKey > 0 && !isShadowed ? ' updated' : ''}`}
    >
      <div className="sync-atom-name">
        {isShadowed ? '🔒 ' : '📡 '}{label}
      </div>
      <div className="sync-atom-value">{branchValue}</div>
      <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{
          width: `${branchValue}%`,
          height: '100%',
          background: barColor,
          transition: 'width 0.4s ease, background 0.3s ease',
          borderRadius: 2,
        }} />
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 4, alignItems: 'center' }}>
        {!isShadowed ? (
          <button
            id={`livesync-override-${id}`}
            className="btn btn-sm btn-ghost"
            onClick={() => onPin(branchValue)}
            title="Pin this atom's value in the branch"
            style={{ fontSize: 11 }}
          >
            📌 Pin
          </button>
        ) : (
          <>
            <button
              id={`livesync-clear-${id}`}
              className="btn btn-sm btn-danger"
              onClick={onUnpin}
              style={{ fontSize: 11 }}
            >
              Unpin
            </button>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              global: {globalValue}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Branch metrics view (rendered inside BranchProvider) ────────────────────
// Reads branch values via useAtom (goes through the branch store).
// Global values are passed in as props — they are read in LiveSync, which sits
// outside the BranchProvider and therefore talks to the global Jotai store.

interface GlobalValues {
  cpu: number;
  mem: number;
  disk: number;
  network: number;
}

function BranchMetrics({
  branch,
  globalValues,
}: {
  branch: ReturnType<typeof useBranch>;
  globalValues: GlobalValues;
}) {
  const [cpu, setCpu]         = useAtom(cpuAtom);
  const [mem, setMem]         = useAtom(memAtom);
  const [disk, setDisk]       = useAtom(diskAtom);
  const [network, setNetwork] = useAtom(networkAtom);

  const rows = [
    { id: 'cpu',     label: 'CPU %',        branchVal: cpu,     globalVal: globalValues.cpu,     set: setCpu,     atom: cpuAtom     },
    { id: 'mem',     label: 'Memory %',     branchVal: mem,     globalVal: globalValues.mem,     set: setMem,     atom: memAtom     },
    { id: 'disk',    label: 'Disk %',       branchVal: disk,    globalVal: globalValues.disk,    set: setDisk,    atom: diskAtom    },
    { id: 'network', label: 'Network MB/s', branchVal: network, globalVal: globalValues.network, set: setNetwork, atom: networkAtom },
  ] as const;

  return (
    <div className="sync-grid">
      {rows.map(v => (
        <MetricCard
          key={v.id}
          id={v.id}
          label={v.label}
          branchValue={v.branchVal}
          globalValue={v.globalVal}
          isShadowed={branch.has(v.atom)}
          onPin={val => v.set(val)}
          onUnpin={() => branch.discard()}
        />
      ))}
    </div>
  );
}

// ─── Demo ────────────────────────────────────────────────────────────────────

export function LiveSync() {
  const [running, setRunning] = useState(false);
  const branch = useBranch();

  // Ticker writes to the global store (this component is outside BranchProvider)
  useGlobalTicker(running);

  // Read global values here — outside BranchProvider — so they always come
  // from the real global Jotai store, not from the branch.
  const globalCpu     = useAtomValue(cpuAtom);
  const globalMem     = useAtomValue(memAtom);
  const globalDisk    = useAtomValue(diskAtom);
  const globalNetwork = useAtomValue(networkAtom);

  const globalValues: GlobalValues = {
    cpu:     globalCpu,
    mem:     globalMem,
    disk:    globalDisk,
    network: globalNetwork,
  };

  return (
    <section id="demo-livesync">
      <div className="demo-header">
        <h1 className="demo-title">📡 Live Sync — Selective Shadowing</h1>
        <p className="demo-description">
          A background timer mutates global atoms every 1.5 seconds.
          Metrics inside the branch are either <strong>live</strong> (pass-through from base store)
          or <strong>pinned</strong> (shadowed by a local override). Pinned metrics freeze at their
          current value while the world keeps ticking. Unpinning instantly re-enables live sync.
        </p>
      </div>

      <div className="info-box info-violet" style={{ marginBottom: '1.25rem' }}>
        <span>💡</span>
        <span>
          <strong>📌 Pin</strong> freezes a metric in the branch. The base store keeps changing but
          the branch intercepts updates for pinned atoms. <strong>Unpin</strong> discards the override
          and re-connects to the live stream. Note: Unpin currently discards all pins for simplicity
          (a <code>branch.delete(atom)</code> API would enable per-atom unpinning).
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          id="livesync-toggle"
          className={`btn ${running ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => setRunning(r => !r)}
        >
          {running ? '⏹ Stop ticker' : '▶ Start ticker'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 13, color: 'var(--text-secondary)' }}>
          <div className={`dot ${running ? 'dot-emerald dot-pulse' : 'dot-muted'}`} />
          {running ? 'Ticking every 1.5s' : 'Ticker paused'}
        </div>
        <span className="badge badge-violet" style={{ marginLeft: 'auto' }}>
          {branch.size} pinned
        </span>
      </div>

      <BranchProvider branch={branch}>
        <BranchMetrics branch={branch} globalValues={globalValues} />
      </BranchProvider>
    </section>
  );
}
