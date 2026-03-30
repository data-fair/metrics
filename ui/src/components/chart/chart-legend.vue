<template>
  <div class="legend mt-2">
    <div class="legend-item text-body-small">
      <v-sheet
        color="accent"
        class="legend-item-square"
        rounded
      />
      <span>Période sélectionnée</span>
    </div>
    <div class="legend-item text-body-small">
      <v-sheet
        color="#9E9E9E"
        class="legend-item-square"
        rounded
      />
      <span>Période précédente</span>
    </div>
  </div>
</template>

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
