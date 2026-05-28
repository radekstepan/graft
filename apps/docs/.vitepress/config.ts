import { defineConfig } from 'vitepress'
import react from '@vitejs/plugin-react'

export default defineConfig({
  title: "Graft",
  description: "Shadow Store Extensions for Jotai",
  base: '/graft/',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'API', link: '/api' },
      { text: 'Playground', link: '/playground' }
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'API Reference', link: '/api' },
          { text: 'Playground', link: '/playground' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/pmndrs/jotai' }
    ]
  },
  vite: {
    plugins: [react()],
    ssr: { noExternal: ['react', 'react-dom', 'graft', 'jotai'] }
  }
})
