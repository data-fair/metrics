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

<script setup lang="ts">
defineProps<{
  loading?: boolean
  value?: string
  title?: string
  subtitle?: string
  trend?: string
}>()
</script>

<style scoped>
</style>
