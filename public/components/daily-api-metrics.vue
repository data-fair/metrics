<template>
  <p>{{ aggResult }}</p>
</template>

<script>
export default {
  data () {
    return {
      aggResult: null
    }
  },
  async created () {
    this.aggResult = await this.$axios.$get('api/v1/daily-api-metrics/_agg')
  }
}
</script>

<style>

</style>
