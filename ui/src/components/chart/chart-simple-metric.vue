<template>
  <v-card
    variant="text"
    :loading="loading"
  >
    <v-card-title class="text-accent-darken-2 text-h3 mt-2 pb-0 justify-center text-center d-flex align-center">
      {{ value }}
      <v-icon
        :color="trend === 'up' ? 'success' : trend === 'down' ? 'error' : 'primary'"
        :icon="trend === 'up' ? mdiTrendingUp : trend === 'down' ? mdiTrendingDown : mdiTrendingNeutral"
        size="x-small"
        class="ml-1"
      />
    </v-card-title>

    <v-card-title class="text-accent-darken-2 text-h6 pt-0 pb-0 justify-center text-center">
      {{ title }}
    </v-card-title>
    <v-card-title class="text-grey-darken-2 text-subtitle-2 mb-2 justify-center text-center">
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
    subtitle: { type: String, default: '' },
    trend: { type: String, default: 'neutral' },
  }
}
</script>

<style>

</style>
