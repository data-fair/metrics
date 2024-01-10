<template>
  <v-app>
    <v-main>
      <NuxtPage />
    </v-main>
  </v-app>
</template>

<script>
// built for being embedded all the time
import 'iframe-resizer/js/iframeResizer.contentWindow'

if (typeof window !== 'undefined') {
  // @ts-ignore
  window.iFrameResizer = {
    heightCalculationMethod: 'taggedElement'
  }
}

export default {}

</script>

<style lang="css">
/* hidden by default to prevent glitch when first displaying the page in embed mode */
html {
  overflow-y: auto;
}
</style>
