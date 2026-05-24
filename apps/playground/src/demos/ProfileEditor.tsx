/**
 * Demo 1: Profile Editor
 *
 * Demonstrates: zero-boilerplate form draft with Cancel (discard) and Save (commit).
 *
 * Key insight: ProfileForm doesn't know it's inside a branch. The exact same
 * component can be used in read-only mode (global store) and edit mode (branch).
 * Derived atoms like permissionsAtom automatically re-compute inside the branch
 * context, reflecting the local draft values.
 */
import React from 'react';
import { atom, useAtom, useAtomValue } from 'jotai';
import { useBranch, BranchProvider } from 'jotai-branch';

// ─── Atoms (defined once, used everywhere) ───────────────────────────────────

interface User {
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  bio: string;
}

export const userAtom = atom<User>({
  name: 'Alice Chen',
  email: 'alice@example.com',
  role: 'admin',
  bio: 'Full-stack developer who loves distributed systems.',
});

export const permissionsAtom = atom((get) => {
  const role = get(userAtom).role;
  const map: Record<User['role'], string[]> = {
    admin:  ['read', 'write', 'delete', 'manage-users'],
    editor: ['read', 'write'],
    viewer: ['read'],
  };
  return map[role] ?? [];
});

// ─── Inner form (reads/writes to whatever store it lives in) ──────────────────

function ProfileForm() {
  const [user, setUser] = useAtom(userAtom);
  const permissions = useAtomValue(permissionsAtom);

  return (
    <div>
      <div className="field">
        <label htmlFor="pf-name">Name</label>
        <input
          id="pf-name"
          value={user.name}
          onChange={e => setUser({ ...user, name: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="pf-email">Email</label>
        <input
          id="pf-email"
          type="email"
          value={user.email}
          onChange={e => setUser({ ...user, email: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="pf-role">Role</label>
        <select
          id="pf-role"
          value={user.role}
          onChange={e => setUser({ ...user, role: e.target.value as User['role'] })}
        >
          <option value="admin">Admin</option>
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="pf-bio">Bio</label>
        <input
          id="pf-bio"
          value={user.bio}
          onChange={e => setUser({ ...user, bio: e.target.value })}
        />
      </div>
      <div style={{ marginTop: '0.75rem' }}>
        <div className="card-label">Derived: permissions</div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {permissions.map(p => (
            <span key={p} className="badge badge-violet">{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Live read-only view of the global store ─────────────────────────────────

function GlobalStateView() {
  const user = useAtomValue(userAtom);
  const permissions = useAtomValue(permissionsAtom);
  return (
    <div>
      <div className="status-row">
        <span style={{ color: 'var(--text-muted)', width: 60, fontSize: 12 }}>Name</span>
        <span>{user.name}</span>
      </div>
      <div className="status-row">
        <span style={{ color: 'var(--text-muted)', width: 60, fontSize: 12 }}>Email</span>
        <span>{user.email}</span>
      </div>
      <div className="status-row">
        <span style={{ color: 'var(--text-muted)', width: 60, fontSize: 12 }}>Role</span>
        <span>{user.role}</span>
      </div>
      <div className="status-row">
        <span style={{ color: 'var(--text-muted)', width: 60, fontSize: 12 }}>Bio</span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user.bio}</span>
      </div>
      <div className="status-row">
        <span style={{ color: 'var(--text-muted)', width: 60, fontSize: 12 }}>Perms</span>
        <span style={{ fontSize: 12, color: 'var(--emerald)' }}>{permissions.join(', ')}</span>
      </div>
    </div>
  );
}

// ─── Editor wrapper that creates the branch ──────────────────────────────────

function Editor() {
  const branch = useBranch();
  const [saved, setSaved] = React.useState(false);

  const handleSave = () => {
    branch.commit();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCancel = () => {
    branch.discard();
  };

  return (
    <div>
      <BranchProvider branch={branch}>
        <ProfileForm />
      </BranchProvider>

      <div className="btn-row">
        <button id="profile-save-btn" className="btn btn-primary" onClick={handleSave}>
          {saved ? '✓ Saved!' : '💾 Save'}
        </button>
        <button id="profile-cancel-btn" className="btn btn-ghost" onClick={handleCancel}>
          ✕ Cancel
        </button>
      </div>

      <div className="info-box info-violet" style={{ marginTop: '1rem', marginBottom: 0 }}>
        <span>💡</span>
        <span>
          <strong>Branch mutations:</strong> {branch.size} atom{branch.size !== 1 ? 's' : ''} overridden.
          {' '}The global store (right) only changes on <code>Save</code>.
        </span>
      </div>
    </div>
  );
}

// ─── Demo ────────────────────────────────────────────────────────────────────

export function ProfileEditor() {
  return (
    <section id="demo-profile">
      <div className="demo-header">
        <h1 className="demo-title">✏️ Profile Editor — Zero-Boilerplate Draft</h1>
        <p className="demo-description">
          A complex form where every edit lands in an isolated branch.
          <code>Cancel</code> calls <code>branch.discard()</code> — all edits vanish instantly.
          <code>Save</code> calls <code>branch.commit()</code> — changes flush to the global store.
          The <code>ProfileForm</code> component has <strong>no idea it's in a draft</strong>.
        </p>
      </div>

      <div className="cols-2">
        <div className="card branch-card">
          <div className="card-label">Branch store (draft)</div>
          <Editor />
        </div>

        <div className="card">
          <div className="card-label">Global store (live)</div>
          <GlobalStateView />
          <div className="info-box info-emerald" style={{ marginTop: '1rem', marginBottom: 0 }}>
            <span>✓</span>
            <span>This view reads directly from the global Jotai store. It only updates when you hit <strong>Save</strong>.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
