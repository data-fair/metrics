<template>
  <!-- the period picker at the top of every embed page, the page's own actions in the default slot -->
  <v-toolbar
    class="mb-4"
    variant="tonal"
    height="auto"
    rounded
  >
    <div class="d-flex align-center flex-wrap w-100 py-2">
      <v-icon
        :icon="mdiCalendarRange"
        class="mx-4"
        color="primary"
        size="x-large"
      />
      <div class="d-flex align-center flex-grow-1 period-fields">
        <filter-period @update:model-value="(value: any) => periods = value" />
      </div>
      <chart-legend />
      <div class="ml-auto">
        <slot />
      </div>
    </div>
  </v-toolbar>
</template>

<script setup lang="ts">
const periods = defineModel<any>()
</script>

<style scoped>
/* the period select grows, without the limit it pushes the legend out of the bar */
.period-fields {
  max-width: 748px;
}
</style>
