import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import { router } from './router'
import { i18n } from './i18n'
import { applyDocumentI18n, getSavedLocale } from './composables/useAppLocale'
import { initGtm } from './utils/gtmBootstrap'
import { fetchCustomChineseFontsCatalog } from './composables/useCustomChineseFontsCatalog'
import { setRuntimeCustomFontCatalog } from './utils/runtimeCustomFontRegistry'
import '../font-styles-export/styles/index.css'
import './style.css'

applyDocumentI18n(getSavedLocale())
initGtm(import.meta.env.VITE_GTM_ID)

void fetchCustomChineseFontsCatalog('/')
  .then(setRuntimeCustomFontCatalog)
  .catch(() => {})

createApp(App)
  .use(createPinia())
  .use(router)
  .use(i18n)
  .use(ElementPlus)
  .mount('#app')
