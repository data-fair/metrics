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
  }
})
