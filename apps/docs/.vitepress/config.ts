import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Branching Atoms",
  description: "Advanced Shadow Store extensions for Jotai v2",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Jotai Branch', link: '/jotai-branch/getting-started' },
      { text: 'Atoms Alt', link: '/atoms-alt/overview' }
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
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/pmndrs/jotai' }
    ]
  }
})
