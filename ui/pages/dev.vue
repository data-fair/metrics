<template>
  <div>
    <v-app-bar density="comfortable">
      <v-spacer />
      <personal-menu dark-mode-switch />
    </v-app-bar>

    <p>
      <ul>
        <li
          v-for="link in links"
          :key="link"
        >
          <a :href="link">{{ link }}</a>
        </li>
      </ul>
    </p>
    <p>
      Session : <pre>{{ session.state }}</pre>
    </p>
  </div>
</template>

<script setup>
// @ts-expect-error lib does not properly export types for vue components yet
import personalMenu from '@data-fair/lib/vuetivy/personal-menu.vue'
// import { useSession } from '@data-fair/lib/vue/session.js'

const session = useSession()

const links = [
  '/simple-directory',
  '/metrics/embed/home'
]
</script>

  <style>

  </style>
