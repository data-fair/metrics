<template>
  <v-container>
    <v-alert type="error">
      {{ error.message || error }}
    </v-alert>
  </v-container>
</template>

<script>
export default {
  layout: 'embed',
  // eslint-disable-next-line vue/require-prop-types
  props: ['error']
}
</script>

<style>

</style>
