<template>
  <resource-audience
    resource-type="datasets"
    :resource-id="route.params.id"
  />
</template>

<script setup lang="ts">
const route = useRoute('/embed/dataset/[id]')
</script>
