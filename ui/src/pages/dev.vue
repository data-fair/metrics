<template>
  <div>
    <v-app-bar density="comfortable">
      <v-spacer />
      <personal-menu dark-mode-switch />
    </v-app-bar>

    <ul>
      <li
        v-for="link in links"
        :key="link[0]"
      >
        <a :href="link[0]">{{ link[1] }}</a>
      </li>
    </ul>
    <p>
      Session :
    </p>
    <pre>{{ session.state }}</pre>
  </div>
</template>

<script setup lang="ts">
// @ts-expect-error lib does not properly export types for vue components yet
import personalMenu from '@data-fair/lib/vuetivy/personal-menu.vue'

const session = useSession()

const links = [
  ['/simple-directory', 'User management'],
  ['/metrics/embed/home', 'Metrics dashboard'],
  ['/built/metrics/embed/home', 'Built version']
]
</script>

  <style>

  </style>
