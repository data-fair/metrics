<template>
  <v-app-bar flat>
    <v-toolbar-items>
      <v-btn
        variant="text"
        href="/metrics/embed/home"
      >
        Audience
      </v-btn>
      <v-btn
        variant="text"
        target="_blank"
        href="/simple-directory"
        color="primary"
      >
        Simple Directory
      </v-btn>
      <v-btn
        variant="text"
        target="_blank"
        href="/data-fair/"
        color="primary"
      >
        Data Fair
      </v-btn>
    </v-toolbar-items>
    <v-spacer />
    <personal-menu />
  </v-app-bar>
</template>

<script setup lang="ts">
import personalMenu from '@data-fair/lib-vuetify/personal-menu.vue'
</script>

<style scoped>
</style>
