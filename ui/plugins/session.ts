import { useSession } from '@data-fair/lib/vue/use-session'
import { Session } from '@data-fair/lib/vue/use-session.d'

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
  const session = await useSession({req: nuxtApp.ssrContext?.event.node.req})
  return { provide: { session } }
})
