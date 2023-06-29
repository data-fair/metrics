import { useSession } from '@data-fair/lib/mjs/vue/use-session'
import { type Session } from '@data-fair/lib/mjs/vue/use-session.d'
import { useCookies, createCookies } from '@vueuse/integrations/useCookies'

// this should not be necessary but for some reason typing of $session is broken without it
// https://nuxt.com/docs/guide/directory-structure/plugins#typing-plugins
declare module '#app' {
  interface NuxtApp {
    $session: Session
  }
}
declare module 'vue' {
  interface ComponentCustomProperties {
    $session: Session
  }
}

export default defineNuxtPlugin(async (nuxtApp) => {
  const route = useRoute()
  const session = await useSession({ req: nuxtApp.ssrContext?.event.node.req, route })
  return { provide: { session } }
})
