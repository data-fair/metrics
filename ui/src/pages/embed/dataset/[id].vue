<template>
  <!-- the audience of one dataset, in a tab of its page in data-fair: the iframe grows with its content -->
  <v-container
    data-iframe-height
    fluid
  >
    <filter-period-bar v-model="periods" />
    <audience-datasets
      v-if="periods"
      :filter="{ statusClass: 'ok', resourceType: 'datasets', resourceId: route.params.id }"
      :periods="periods"
    />
  </v-container>
</template>

<script setup lang="ts">
const route = useRoute('/embed/dataset/[id]')
const periods = ref<any>(null)
</script>
