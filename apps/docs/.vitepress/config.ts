import { defineConfig } from 'vitepress'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  title: "Branching Atoms",
  description: "Advanced Shadow Store extensions for Jotai v2",
  cleanUrls: true,

  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap' }],
  ],

  vite: {
    plugins: [react()],
    resolve: {
      alias: {
        'jotai-branch': path.resolve(__dirname, '../../../packages/jotai-branch/src/index.ts'),
        'atoms-alt': path.resolve(__dirname, '../../../packages/atoms-alt/src/index.ts'),
      },
    },
  },

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Jotai Branch', link: '/jotai-branch/getting-started' },
      { text: 'Atoms Alt', link: '/atoms-alt/overview' },
      { text: 'Playground', link: '/playground' }
    ],

    sidebar: [
      {
        text: 'Jotai Branch',
        items: [
          { text: 'Getting Started', link: '/jotai-branch/getting-started' },
          { text: 'API Reference', link: '/jotai-branch/api' }
        ]
      },
      {
        text: 'Atoms Alt',
        items: [
          { text: 'Overview', link: '/atoms-alt/overview' }
        ]
      },
      {
        text: 'Interactive',
        items: [
          { text: 'Playground', link: '/playground' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/pmndrs/jotai' }
    ]
  }
})
