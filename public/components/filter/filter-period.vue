<template>
  <v-row class="ma-0">
    <v-select
      :value="selectItems.find(si => si.value.start === period.start && si.value.end === period.end)"
      :items="selectItems"
      label="période"
      style="max-width: 360px;"
      hide-details
      outlined
      dense
      class="mr-4"
      @input="v => period = {...v}"
    />
    <filter-date-picker
      v-model="period.start"
      label="début"
    />
    <filter-date-picker
      v-model="period.end"
      label="fin"
    />
  </v-row>
</template>

<script>
export default {

  data () {
    return {
      period: {
        start: null,
        end: null
      }
    }
  },
  computed: {
    selectItems () {
      return [
        {
          text: '7 derniers jours',
          value: {
            start: this.$day().subtract(7, 'days').format('YYYY-MM-DD'),
            end: this.$day().format('YYYY-MM-DD')
          }
        },
        {
          text: 'Dernière semaine (du lundi au dimanche)',
          value: {
            start: this.$day().startOf('week').subtract(7, 'days').format('YYYY-MM-DD'),
            end: this.$day().startOf('week').format('YYYY-MM-DD')
          }
        },
        {
          text: '30 derniers jours',
          value: {
            start: this.$day().subtract(30, 'days').format('YYYY-MM-DD'),
            end: this.$day().format('YYYY-MM-DD')
          }
        },
        {
          text: 'Dernier mois écoulé',
          value: {
            start: this.$day().startOf('month').subtract(1, 'days').startOf('month').format('YYYY-MM-DD'),
            end: this.$day().startOf('month').subtract(1, 'days').format('YYYY-MM-DD')
          }
        },
        {
          text: '360 derniers jours',
          value: {
            start: this.$day().subtract(360, 'days').format('YYYY-MM-DD'),
            end: this.$day().format('YYYY-MM-DD')
          }
        }
      ]
    }
  },
  watch: {
    period () {
      const duration = this.$day(this.period.end).diff(this.period.start, 'day')
      this.$emit('input', {
        previous: {
          start: this.$day(this.period.start).subtract(duration + 1, 'days').format('YYYY-MM-DD'),
          end: this.$day(this.period.start).subtract(1, 'days').format('YYYY-MM-DD')
        },
        current: { ...this.period }
      })
    }
  },
  mounted () {
    this.period = { ...this.selectItems[0].value }
  }
}
</script>

<style>

</style>
