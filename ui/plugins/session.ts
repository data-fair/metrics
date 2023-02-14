// this should not be necessary but for some reason typing of $session is broken without it
// https://nuxt.com/docs/guide/directory-structure/plugins#typing-plugins
// TODO: try to get rid of it
import { Session } from '~/composables/use-session'

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

export default defineNuxtPlugin(async () => {
  const session = await useSession()
  return { provide: { session } }
})
