import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { defaultOptions } from '@data-fair/lib/vuetify.js'
import { createReactiveSearchParams } from '@data-fair/lib/vue/reactive-search-params.js'
import { createSession } from '@data-fair/lib/vue/session.js'
import { createI18n } from 'vue-i18n'
import App from './App.vue'

const router = createRouter({ history: createWebHistory('/metrics/'), routes })
const reactiveSearchParams = createReactiveSearchParams(router)
const session = await createSession({ directoryUrl: $sitePath + '/simple-directory' })
const vuetify = createVuetify(defaultOptions(reactiveSearchParams.value, session.value.state.dark))
const i18n = createI18n({ locale: session.value.state.lang })

createApp(App)
  .use(router)
  .use(reactiveSearchParams)
  .use(session)
  .use(vuetify)
  .use(i18n)
  .mount('#app')
