import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'jotai-branch': path.resolve(__dirname, '../../packages/jotai-branch/src/index.ts'),
    },
  },
});
