import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { createVuetify } from 'vuetify'
import { defaultOptions } from '@data-fair/lib-vuetify'
import { createReactiveSearchParams } from '@data-fair/lib-vue/reactive-search-params.js'
import { createLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import { createSession } from '@data-fair/lib-vue/session.js'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import './main.scss'

(async function () {
  const router = createRouter({ history: createWebHistory($sitePath + '/metrics/'), routes })
  const reactiveSearchParams = createReactiveSearchParams(router)
  const session = await createSession({ directoryUrl: $sitePath + '/simple-directory' })
  const localeDayjs = createLocaleDayjs(session.state.lang)
  const vuetify = createVuetify(defaultOptions(reactiveSearchParams.value, session.state.dark))
  const i18n = createI18n({ locale: session.state.lang })

  createApp(App)
    .use(router)
    .use(reactiveSearchParams)
    .use(session)
    .use(localeDayjs)
    .use(vuetify)
    .use(i18n)
    .mount('#app')
})()
