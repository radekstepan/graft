import { defineConfig } from 'vitepress'
import react from '@vitejs/plugin-react'

export default defineConfig({
  title: "Branching Atoms",
  description: "Shadow Store Extensions for Jotai",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/jotai-branch/getting-started' },
      { text: 'API', link: '/jotai-branch/api' },
      { text: 'Playground', link: '/playground' }
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/jotai-branch/getting-started' },
          { text: 'API Reference', link: '/jotai-branch/api' },
          { text: 'Playground', link: '/playground' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/pmndrs/jotai' }
    ]
  },
  vite: {
    plugins: [react()]
  }
})
