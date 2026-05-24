/**
 * Demo 2: Optimistic Todos
 *
 * Demonstrates: per-item branch for optimistic UI mutations.
 *
 * Each TodoItem creates its own branch. On toggle:
 *   1. Writes the new state to the branch (UI updates instantly)
 *   2. Awaits the simulated network call
 *   3. On success → branch.commit() (global store adopts the change)
 *   4. On failure → branch.discard() (UI snaps back with zero reversal logic)
 *
 * A "Network Mode" toggle lets you switch between success and failure to
 * observe the rollback in action.
 */
import React, { useState } from 'react';
import { atom, useAtom, useAtomValue } from 'jotai';
import { useBranch } from 'jotai-branch';

// ─── Atoms ───────────────────────────────────────────────────────────────────

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

const todosAtom = atom<Todo[]>([
  { id: 1, title: 'Design the Shadow Store architecture',   completed: true  },
  { id: 2, title: 'Implement BranchStore with commit/discard', completed: false },
  { id: 3, title: 'Wire useSyncExternalStore to branch',   completed: false },
  { id: 4, title: 'Build the playground demos',            completed: false },
  { id: 5, title: 'Write integration tests',               completed: false },
]);

// Simulate network — resolves after `delay` ms; rejects if `shouldFail`
function fakeNetwork(delay: number, shouldFail: boolean): Promise<void> {
  return new Promise((resolve, reject) =>
    setTimeout(() => shouldFail ? reject(new Error('Network error')) : resolve(), delay)
  );
}

// ─── Log entry ───────────────────────────────────────────────────────────────

interface LogEntry {
  id: number;
  msg: string;
  type: 'info' | 'success' | 'error' | 'warn';
}

// ─── Single todo row with its own branch ─────────────────────────────────────

interface TodoItemProps {
  todoAtom: ReturnType<typeof atom<Todo>>;
  shouldFail: boolean;
  onLog: (msg: string, type: LogEntry['type']) => void;
}

function TodoItem({ todoAtom, shouldFail, onLog }: TodoItemProps) {
  const branch = useBranch();
  const [todo, setTodo] = useAtom(todoAtom, { store: branch });
  const [pending, setPending] = useState(false);
  const [isOptimistic, setIsOptimistic] = useState(false);

  const toggle = async () => {
    if (pending) return;

    const next = !todo.completed;
    setPending(true);
    setIsOptimistic(true);

    // 1. Optimistic write — branch updates, UI reflects it immediately
    setTodo({ ...todo, completed: next });
    onLog(`[#${todo.id}] Optimistic write: completed → ${next}`, 'info');

    try {
      // 2. Simulate network (800ms)
      await fakeNetwork(800, shouldFail);

      // 3. Flush to global store
      branch.commit();
      onLog(`[#${todo.id}] ✓ Network success — committed to global store`, 'success');
    } catch {
      // 4. Rollback — UI snaps back automatically
      branch.discard();
      onLog(`[#${todo.id}] ✗ Network failed — branch discarded (rolled back)`, 'error');
    } finally {
      setPending(false);
      setIsOptimistic(false);
    }
  };

  return (
    <div className={`todo-item${todo.completed ? ' done' : ''}${isOptimistic ? ' optimistic' : ''}`}>
      <div className="dot" style={{
        background: todo.completed ? 'var(--emerald)' : 'var(--text-muted)',
        boxShadow: todo.completed ? '0 0 6px var(--emerald)' : 'none',
        flexShrink: 0,
        width: 8, height: 8, borderRadius: '50%',
      }} />
      <span className="todo-text">{todo.title}</span>
      {isOptimistic && (
        <span className="badge badge-amber">optimistic</span>
      )}
      <button
        className={`btn btn-sm ${todo.completed ? 'btn-ghost' : 'btn-success'}`}
        onClick={toggle}
        disabled={pending}
        id={`todo-toggle-${todo.id}`}
      >
        {pending ? <span className="spinner" /> : (todo.completed ? 'Undo' : 'Complete')}
      </button>
    </div>
  );
}

// ─── Demo ────────────────────────────────────────────────────────────────────

export function OptimisticTodos() {
  const todos = useAtomValue(todosAtom);
  const [shouldFail, setShouldFail] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const logId = React.useRef(0);

  // Create stable per-todo atoms
  const todoAtoms = React.useMemo(
    () => todos.map(t => atom<Todo>(t)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const addLog = (msg: string, type: LogEntry['type']) => {
    setLog(prev => [{ id: ++logId.current, msg, type }, ...prev].slice(0, 12));
  };

  const dotClass: Record<LogEntry['type'], string> = {
    info:    'dot-violet',
    success: 'dot-emerald',
    error:   'dot-rose',
    warn:    'dot-amber',
  };

  return (
    <section id="demo-todos">
      <div className="demo-header">
        <h1 className="demo-title">⚡ Optimistic Todos — Instant UI with Rollback</h1>
        <p className="demo-description">
          Each todo gets its own branch. Toggling applies the change <strong>instantly</strong> via
          an optimistic write to the branch. On network success, <code>branch.commit()</code>
          makes it permanent. On failure, <code>branch.discard()</code> snaps the UI back —
          no manual reversal logic needed.
        </p>
      </div>

      <div className="info-box info-amber">
        <span>⚙️</span>
        <div>
          <strong>Network mode: </strong>
          <button
            id="todo-network-toggle"
            className={`btn btn-sm ${shouldFail ? 'btn-danger' : 'btn-success'}`}
            style={{ marginLeft: 8 }}
            onClick={() => setShouldFail(f => !f)}
          >
            {shouldFail ? '✗ Will fail — click to fix' : '✓ Will succeed — click to break'}
          </button>
        </div>
      </div>

      <div className="cols-2">
        <div className="card">
          <div className="card-label">Todo list</div>
          <div className="todo-list">
            {todoAtoms.map((ta, i) => (
              <TodoItem
                key={todos[i]!.id}
                todoAtom={ta}
                shouldFail={shouldFail}
                onLog={addLog}
              />
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-label">Event log</div>
          {log.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Toggle a todo to see events…
            </p>
          ) : (
            <div>
              {log.map(entry => (
                <div key={entry.id} className="status-row">
                  <div className={`dot ${dotClass[entry.type]}`} />
                  <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)' }}>
                    {entry.msg}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
