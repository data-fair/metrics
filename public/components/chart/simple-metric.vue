<template>
  <v-card
    outlined
    shaped
    :loading="loading"
  >
    <v-card-title class="primary--text text--darken2 text-h4 justify-center mt-2">
      {{ title }}
    </v-card-title>
    <v-card-title class="primary--text text--darken2 text-subtitle-1 justify-center mb-2">
      {{ subtitle }}
    </v-card-title>
  </v-card>
</template>

<script>
export default {
  props: {
    loading: { type: Boolean, default: true },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' }
  }
}
</script>

<style>

</style>
