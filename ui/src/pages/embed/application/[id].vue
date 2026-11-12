<template>
  <resource-audience
    resource-type="applications"
    :resource-id="route.params.id"
  />
</template>

<script setup lang="ts">
const route = useRoute('/embed/application/[id]')
</script>
