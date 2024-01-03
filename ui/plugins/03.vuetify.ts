import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { defaultOptions } from '@data-fair/lib/vuetify.js'
import useReactiveSearchParams from '@data-fair/lib/vue/reactive-search-params.js'

export default defineNuxtPlugin((nuxtApp) => {
  const reactiveSearchParams = useReactiveSearchParams()
  const vuetify = createVuetify(defaultOptions(reactiveSearchParams))
  nuxtApp.vueApp.use(vuetify)
})
