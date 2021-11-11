<template>
  <v-app class="embed">
    <v-main>
      <nuxt />
      <layout-notifications />
    </v-main>
  </v-app>
</template>

<script>
export default {}

</script>

<style lang="css">
/* hidden by default to prevent glitch when first displaying the page in embed mode */
html {
  overflow-y: auto;
}
</style>
