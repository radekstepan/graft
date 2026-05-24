import React, { useState } from 'react';

// jotai-branch demos
import { ProfileEditor } from './demos/ProfileEditor';
import { OptimisticTodos } from './demos/OptimisticTodos';
import { NestedBranches } from './demos/NestedBranches';
import { LiveSync } from './demos/LiveSync';

// atoms-alt demos
import { HandlerStackBasics } from './demos/HandlerStackBasics';
import { CustomHandlers } from './demos/CustomHandlers';

// ─── Types ────────────────────────────────────────────────────────────────────

type Library = 'jotai-branch' | 'atoms-alt';

type BranchTabId = 'profile' | 'todos' | 'nested' | 'livesync';
type AltTabId = 'handler-stack' | 'custom-handlers';
type TabId = BranchTabId | AltTabId;

const BRANCH_TABS: { id: BranchTabId; label: string; emoji: string }[] = [
  { id: 'profile',  label: 'Profile Editor',  emoji: '✏️' },
  { id: 'todos',    label: 'Optimistic Todos', emoji: '⚡' },
  { id: 'nested',   label: 'Nested Branches',  emoji: '🌿' },
  { id: 'livesync', label: 'Live Sync',        emoji: '📡' },
];

const ALT_TABS: { id: AltTabId; label: string; emoji: string }[] = [
  { id: 'handler-stack',   label: 'Handler Stack', emoji: '🔧' },
  { id: 'custom-handlers', label: 'Custom Handlers', emoji: '🧩' },
];

// ─── Library switcher ─────────────────────────────────────────────────────────

interface LibraryTabProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  id: string;
}

function LibraryTab({ active, onClick, children, id }: LibraryTabProps) {
  return (
    <button
      id={id}
      className={`lib-tab${active ? ' active' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [library, setLibrary] = useState<Library>('jotai-branch');
  const [branchTab, setBranchTab] = useState<BranchTabId>('profile');
  const [altTab, setAltTab] = useState<AltTabId>('handler-stack');

  const currentTabs = library === 'jotai-branch' ? BRANCH_TABS : ALT_TABS;
  const activeTabId: TabId = library === 'jotai-branch' ? branchTab : altTab;

  function setActiveTab(id: TabId) {
    if (library === 'jotai-branch') {
      setBranchTab(id as BranchTabId);
    } else {
      setAltTab(id as AltTabId);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <div className="header-brand">
            <div className="header-logo">⚛</div>
            <div className="header-title-group">
              <span className="header-title">Atoms Playground</span>
              <span className="header-subtitle">Experimental state management concepts</span>
            </div>
          </div>

          {/* Library switcher */}
          <div className="lib-switcher" role="group" aria-label="Switch library">
            <LibraryTab
              id="lib-jotai-branch"
              active={library === 'jotai-branch'}
              onClick={() => setLibrary('jotai-branch')}
            >
              🌿 jotai-branch
            </LibraryTab>
            <LibraryTab
              id="lib-atoms-alt"
              active={library === 'atoms-alt'}
              onClick={() => setLibrary('atoms-alt')}
            >
              🔧 atoms-alt
            </LibraryTab>
          </div>
        </div>

        {/* Library description badge */}
        <div className="lib-description">
          {library === 'jotai-branch' ? (
            <span>
              <strong>jotai-branch</strong> — Shadow Store extension for Jotai v2.
              Branch, edit, commit or discard. Zero-boilerplate draft state.
            </span>
          ) : (
            <span>
              <strong>atoms-alt</strong> — Atoms as pure identity declarations;
              effects injected via a composable Handler Stack at the Store level.
            </span>
          )}
        </div>

        {/* Demo tabs */}
        <nav className="tabs" role="tablist" aria-label="Demo sections">
          {currentTabs.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={activeTabId === tab.id}
              aria-controls={`panel-${tab.id}`}
              className={`tab-btn${activeTabId === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="main">
        {/* jotai-branch demos */}
        {library === 'jotai-branch' && branchTab === 'profile'  && <ProfileEditor />}
        {library === 'jotai-branch' && branchTab === 'todos'    && <OptimisticTodos />}
        {library === 'jotai-branch' && branchTab === 'nested'   && <NestedBranches />}
        {library === 'jotai-branch' && branchTab === 'livesync' && <LiveSync />}

        {/* atoms-alt demos */}
        {library === 'atoms-alt' && altTab === 'handler-stack'   && <HandlerStackBasics />}
        {library === 'atoms-alt' && altTab === 'custom-handlers' && <CustomHandlers />}
      </main>
    </div>
  );
}
