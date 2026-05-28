<template>
  <div class="react-playground">
    <div ref="rootEl"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { createRoot } from 'react-dom/client'
import React from 'react'
import { App } from '../../../playground/App'

const rootEl = ref(null)
let root = null

onMounted(() => {
  if (rootEl.value) {
    root = createRoot(rootEl.value)
    root.render(React.createElement(App))
  }
})

onUnmounted(() => {
  if (root) {
    root.unmount()
  }
})
</script>

<style>
.react-playground {
  margin-top: 1.5rem;
}

/* ── Buttons ─────────────────────────────────────── */
.react-playground button {
  background-color: var(--vp-button-alt-bg);
  color: var(--vp-button-alt-text);
  border: 1px solid var(--vp-button-alt-border);
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}
.react-playground button:hover:not(:disabled) {
  background-color: var(--vp-button-alt-hover-bg);
}
.react-playground button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Inputs ──────────────────────────────────────── */
.react-playground input[type="text"],
.react-playground input:not([type]) {
  border: 1px solid var(--vp-c-border);
  padding: 6px 10px;
  border-radius: 4px;
  background-color: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  font-size: 14px;
  transition: border-color 0.2s;
}
.react-playground input:focus {
  border-color: var(--vp-c-brand-1);
  outline: none;
}

/* ── Todo item hover ─────────────────────────────── */
.react-playground .todo-item:hover .todo-delete {
  opacity: 1;
}
.react-playground .todo-delete {
  opacity: 0;
  transition: opacity 0.15s;
}

/* ── Edit input ──────────────────────────────────── */
.react-playground .todo-edit-input {
  border: 2px solid var(--vp-c-brand-1) !important;
  padding: 4px 8px;
}

/* ── Spinner animation ───────────────────────────── */
.react-playground .todo-spinner {
  display: inline-block;
  animation: todo-spin 0.8s linear infinite;
}
@keyframes todo-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* ── Filter active ───────────────────────────────── */
.react-playground .todo-filter-active {
  border: 1px solid var(--vp-c-brand-1) !important;
  color: var(--vp-c-brand-1) !important;
}
</style>
