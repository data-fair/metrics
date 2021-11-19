<template>
  <v-app class="embed">
    <v-main data-iframe-height>
      <nuxt />
      <layout-notifications />
    </v-main>
  </v-app>
</template>

<script>
import 'iframe-resizer/js/iframeResizer.contentWindow'

global.iFrameResizer = {
  heightCalculationMethod: 'taggedElement'
}

export default {}

</script>

<style lang="css">
/* hidden by default to prevent glitch when first displaying the page in embed mode */
html {
  overflow-y: auto;
}
</style>
