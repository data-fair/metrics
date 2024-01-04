<template>
  <v-card
    variant="text"
    :loading="loading"
  >
    <v-card-title class="accent--text text--darken-2 text-h3 mt-2 pb-0 justify-center text-center">
      {{ value }}
    </v-card-title>
    <v-card-title class="accent--text text--darken-2 text-h6 pt-0 pb-0 justify-center text-center">
      {{ title }}
    </v-card-title>
    <v-card-title class="grey--text text--darken-2 text-subtitle-2 mb-2 justify-center text-center">
      {{ subtitle }}
    </v-card-title>
  </v-card>
</template>

<script>
export default {
  props: {
    loading: { type: Boolean, default: true },
    value: { type: String, default: '' },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' }
  }
}
</script>

<style>

</style>
