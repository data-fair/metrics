import { useSession, type Session } from '@data-fair/lib/vue/use-session.js'

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
