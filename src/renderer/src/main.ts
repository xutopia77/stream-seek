import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
const pinia = createPinia()
import App from './App.vue'
import i18n from './i18n'

import router from './router/router'
const app = createApp(App)
app.use(router)
app.use(pinia)
// 使用国际化
app.use(i18n)
app.mount('#app')
