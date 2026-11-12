<template>
  <v-app>
    <v-main>
      <RouterView />
      <ui-notif />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import uiNotif from '@data-fair/lib-vuetify/ui-notif.vue'

const session = useSession()
// index.html declares a static lang, replaced by the session language once known
watchEffect(() => { document.documentElement.lang = session.lang.value ?? 'fr' })
</script>
