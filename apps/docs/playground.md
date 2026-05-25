# Playground

Try `jotai-branch` in action. The top section shows the global Jotai state, and the bottom section is an isolated shadow draft powered by `<BranchProvider>`.

When you modify the Name or Count in the Branch Editor, notice how the Global State remains untouched. Once you click **Commit**, the changes flush to the Global State. If you click **Discard**, the draft reverts back to the global values.

<ClientOnly>
  <ReactPlayground />
</ClientOnly>
