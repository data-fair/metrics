<template>
  <div class="legend mt-2">
    <div class="legend-item text-caption">
      <v-sheet
        rounded
        color="accent"
        class="legend-item-square"
      />
      <span>période sélectionnée</span>
    </div>
    <div class="legend-item text-caption">
      <v-sheet
        rounded
        color="#9E9E9E"
        class="legend-item-square"
      />
      <span>période précédente</span>
    </div>
  </div>
</template>

<script>
export default {

}
</script>

<style>
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
