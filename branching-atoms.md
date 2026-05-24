Here is the API sketch for the Shadow Store architecture. Let's call the concept **Branching Atoms**.

The goal of the API is to feel entirely invisible to the developer. They shouldn't have to think about DAGs, topological taint waves, or memoization splits. To them, they are just reading and writing standard atoms—but inside a perfectly isolated, disposable sandbox.

Because our branch is fundamentally a proxy `Store` (adhering to our split `Mutations` and `Memo` formalization), it seamlessly integrates with React's Context and `useSyncExternalStore`.

## The Core API

We introduce a single primitive hook: `useBranch()`. It creates a stable reference to a Shadow Store linked to the main global store.

```javascript
import { atom, useAtom } from 'jotai';
import { useBranch, BranchProvider } from 'jotai-branch';

// 1. Define standard atoms (no special syntax required)
const userAtom = atom({ name: 'Alice', role: 'admin' });
const permissionsAtom = atom((get) => 
  get(userAtom).role === 'admin' ? ['read', 'write'] : ['read']
);

function ProfileEditor() {
  // 2. Initialize the Shadow Store
  const branch = useBranch();

  const handleSave = async () => {
    await api.saveUser(branch.get(userAtom));
    branch.commit(); // Flushes Mutations_B to the base store
  };

  return (
    // 3. Wrap the subtree. All useAtom calls inside this provider 
    // will now transparently read/write to the Shadow Store.
    <BranchProvider branch={branch}>
      <ProfileForm />
      <button onClick={handleSave}>Save</button>
      <button onClick={branch.discard}>Cancel</button>
    </BranchProvider>
  );
}

```

---

## Example 1: The "Zero-Boilerplate" Complex Form

**The Problem in Standard React/Jotai:** If you want a deeply nested form with a "Cancel" button, you have to duplicate your global state into local `useState`, manually sync it with `useEffect` if the base state changes in the background, and manually merge it back on save.

**The Branching Solution:** The branch inherently acts as a draft.

```javascript
function ProfileForm() {
  // This automatically reads from Cache_B, or falls through to base.
  // Writes go directly to Mutations_B.
  const [user, setUser] = useAtom(userAtom);
  
  // This evaluates lazily. If userAtom is overridden in this branch, 
  // permissionsAtom recalculates using the branch context and saves to Memo_B.
  const [permissions] = useAtom(permissionsAtom);

  return (
    <div>
      <input 
        value={user.name} 
        onChange={e => setUser({ ...user, name: e.target.value })} 
      />
      <p> Your permissions: {permissions.join(', ')} </p>
    </div>
  );
}

```

**Why this is powerful:** The `ProfileForm` component doesn't know it's in a draft. You can reuse the exact same components for displaying the live global state and editing the drafted state, simply by wrapping the editor in a `<BranchProvider>`.

---

## Example 2: Optimistic UI & Rollbacks

Because branches are cheap and deterministic, they are the perfect vehicle for optimistic mutations. Instead of manually writing reversal logic for network failures, you mutate a branch, render it, and simply discard it if the server rejects the change.

```javascript
function TodoItem({ todoAtom }) {
  const branch = useBranch();
  
  // We bypass the Provider here and pass the branch directly as a store proxy
  // for hyper-local branch scoping.
  const [todo, setTodo] = useAtom(todoAtom, { store: branch });

  const toggleStatus = async () => {
    // 1. Optimistic write (UI updates instantly via the branch)
    setTodo({ ...todo, completed: !todo.completed });

    try {
      // 2. Wait for network
      await api.updateTodo(todo.id, !todo.completed);
      // 3. Network success: apply the leaf mutation to the global DAG
      branch.commit(); 
    } catch (error) {
      // 4. Network failure: destroy the branch. 
      // The UI instantly snaps back to the base graph's state.
      branch.discard(); 
    }
  };

  return (
    <li className={todo.completed ? 'done' : ''}>
      {todo.title}
      <button onClick={toggleStatus}>Toggle</button>
    </li>
  );
}

```

---

## React Integration (`useSyncExternalStore`)

To make this work seamlessly with Concurrent React, the Branch is wired into `useSyncExternalStore` identically to a standard store, but its `subscribe` method is slightly modified.

When a component subscribes to an atom inside a branch:

1. It registers a listener on the `Branch`.
2. The `Branch` maintains a subscription to the `Base Store` for that specific atom.
3. If the base store updates, the branch checks its $\text{Mutations}_B$ map. If the atom is explicitly overridden by the user, the base update is intercepted and ignored (the local edit shadows the background update).
4. If it is *not* overridden, the branch forwards the invalidation to React, causing the component to re-render with the fresh base data.

This is what makes the architecture robust: it doesn't just isolate state, it gracefully handles live background updates merging into the unedited fields of an active draft.