import { createVuetify } from 'vuetify'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { defaultOptions } from '@data-fair/lib/vuetify.js'
import { useReactiveSearchParams } from '@data-fair/lib/vue/reactive-search-params.js'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(createVuetify(defaultOptions(useReactiveSearchParams())))
})
