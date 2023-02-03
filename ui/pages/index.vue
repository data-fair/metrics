<template>
  <div>Hello ! {{ session }}</div>
</template>

<script setup lang="ts">
const session = useSession('test', useCookie)
</script>

<style>

</style>
