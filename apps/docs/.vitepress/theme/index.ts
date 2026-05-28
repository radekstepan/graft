import DefaultTheme from 'vitepress/theme'
import ReactPlayground from './components/ReactPlayground.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ReactPlayground', ReactPlayground)
  }
}
