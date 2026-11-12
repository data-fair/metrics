<template>
  <div class="legend mt-2">
    <div class="legend-item text-body-small">
      <v-sheet
        color="accent"
        class="legend-item-square"
        rounded
      />
      <span>{{ t('selectedPeriod') }}</span>
    </div>
    <div class="legend-item text-body-small">
      <v-sheet
        color="#9E9E9E"
        class="legend-item-square"
        rounded
      />
      <span>{{ t('previousPeriod') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped>
.legend .legend-item-square {
  width:12px;
  height:12px;
  display:inline-block;
  margin-right:8px;
  position: relative;top: 2px;
}
.legend .legend-item {
  line-height: 20px;
}
</style>

<i18n lang="yaml">
en:
  selectedPeriod: Selected period
  previousPeriod: Previous period
fr:
  selectedPeriod: Période sélectionnée
  previousPeriod: Période précédente
</i18n>
