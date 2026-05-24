import React, { useState } from 'react';
import { ProfileEditor } from './demos/ProfileEditor';
import { OptimisticTodos } from './demos/OptimisticTodos';
import { NestedBranches } from './demos/NestedBranches';
import { LiveSync } from './demos/LiveSync';

type TabId = 'profile' | 'todos' | 'nested' | 'livesync';

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: 'profile',  label: 'Profile Editor',   emoji: '✏️' },
  { id: 'todos',    label: 'Optimistic Todos',  emoji: '⚡' },
  { id: 'nested',   label: 'Nested Branches',   emoji: '🌿' },
  { id: 'livesync', label: 'Live Sync',         emoji: '📡' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">⚛</div>
          <span className="header-title">jotai-branch</span>
          <span className="header-badge">v0.1.0</span>
        </div>
        <nav className="tabs" role="tablist" aria-label="Demo sections">
          {TABS.map(tab => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="main">
        {activeTab === 'profile'  && <ProfileEditor />}
        {activeTab === 'todos'    && <OptimisticTodos />}
        {activeTab === 'nested'   && <NestedBranches />}
        {activeTab === 'livesync' && <LiveSync />}
      </main>
    </div>
  );
}
