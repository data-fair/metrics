import { createVuetify } from 'vuetify'
import { defaultOptions } from '@data-fair/lib/vuetify.js'

export default defineNuxtPlugin((nuxtApp) => {
  const vuetify = createVuetify(defaultOptions)
  nuxtApp.vueApp.use(vuetify)
})
