// https://www.the-koi.com/projects/how-to-set-up-a-project-with-nuxt3-and-vuetify3-with-a-quick-overview/
import vuetify from 'vite-plugin-vuetify'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  typescript: {
    shim: false
  },
  app: {
    baseURL: '/metrics/'
  },
  runtimeConfig: {
    public: {
      directoryUrl: '/simple-directory'
    }
  },
  modules: [
    '@nuxtjs/i18n',
    // @ts-ignore
    (_, nuxt) => nuxt.hooks.hook('vite:extendConfig', config => config.plugins.push(vuetify()))
  ],
  css: ['vuetify/styles'],
  build: {
    transpile: [/@koumoul/, /@data-fair/, /vuetify/, /@vueuse/]
  }
})
