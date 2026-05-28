# Getting Started

`graft` is a shadow-store extension for [Jotai](https://jotai.org). It allows you to create isolated "branches" of your global state. 

When you write to an atom inside a branch, the mutation is kept locally within the branch. Reads will reflect this local draft, but the global store remains completely untouched. You can then `commit()` the branch to flush all changes to the global store at once, or `discard()` the branch to revert back to the global state.

## Installation

```bash
npm install graft
# or
yarn add graft
# or
pnpm add graft
```

## The Concept

Imagine a global `userAtom`. You want to build a profile editor where the user can tweak their name and bio. You don't want these changes hitting the global state immediately (perhaps because other parts of the UI would update prematurely, or because you want a clean "Cancel" button).

With `graft`, you wrap the editor in a `<BranchProvider>`. All `useAtom` calls inside this provider automatically read and write to the isolated branch.

## Quick Example

```tsx
import { atom, useAtom } from 'jotai'
import { BranchProvider, useBranch, useBranchStatus } from 'graft'

const nameAtom = atom('Alice')

function EditorForm() {
  // Reads and writes happen on the branch
  const [name, setName] = useAtom(nameAtom)
  return <input value={name} onChange={e => setName(e.target.value)} />
}

function SaveBar() {
  const branch = useBranch()
  // Reactively updates when the branch has pending changes
  const { isDirty } = useBranchStatus(branch)

  if (!isDirty) return null

  return (
    <div>
      <button onClick={() => branch.commit()}>Save</button>
      <button onClick={() => branch.discard()}>Cancel</button>
    </div>
  )
}

export function ProfileEditor() {
  const branch = useBranch()

  return (
    <BranchProvider branch={branch}>
      <EditorForm />
      <SaveBar />
    </BranchProvider>
  )
}
```
