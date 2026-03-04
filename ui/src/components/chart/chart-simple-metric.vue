<template>
  <v-card
    class="text-center"
    variant="text"
    :loading="loading"
  >
    <v-card-title class="text-display-medium py-4">
      {{ value }}
      <v-icon
        :color="trend === 'up' ? 'success' : trend === 'down' ? 'error' : 'primary'"
        :icon="trend === 'up' ? mdiTrendingUp : trend === 'down' ? mdiTrendingDown : mdiTrendingNeutral"
        size="x-small"
        class="ml-1"
      />
    </v-card-title>

    <v-card-text>
      <div class="text-title-large mb-2">
        {{ title }}
      </div>
      <div class="text-title-small">
        {{ subtitle }}
      </div>
    </v-card-text>
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
