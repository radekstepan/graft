# Playground

A **Todo MVC** app powered by `graft`. This playground showcases the library's core features in a realistic scenario:

- **Branch editing** — Double-click any todo to edit its title. Changes are isolated in a shadow store until you press <kbd>Enter</kbd> to commit or <kbd>Esc</kbd> to discard. The branch panel shows a live diff of pending changes.
- **Optimistic toggles** — Click a checkbox to toggle completion. The UI updates instantly via a branch, then commits after a simulated server delay (with a 10% failure rate that reverts the change).
- **Live diff panel** — The Branch Draft panel at the bottom shows exactly what the branch would change before it is committed, powered by `useBranchStatus`.

Derived atoms (`filteredTodosAtom`, `activeCountAtom`) automatically recalculate from branch overrides, so filtered views and counts update optimistically without any extra code.

<ClientOnly>
  <ReactPlayground />
</ClientOnly>
