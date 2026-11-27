<template>
  <!-- the audience of one application, in a tab of its page in data-fair: the iframe grows with its content -->
  <v-container
    data-iframe-height
    fluid
  >
    <filter-period-bar v-model="periods" />
    <audience-application
      v-if="periods"
      :application-id="route.params.id"
      :periods="periods"
    />
  </v-container>
</template>

<script setup lang="ts">
const route = useRoute('/embed/application/[id]')
const periods = ref<any>(null)
</script>
