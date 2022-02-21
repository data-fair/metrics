<template>
  <v-row class="ma-0">
    <v-select
      :value="selectItems.find(si => !si.value || (si.value.start === period.start && si.value.end === period.end))"
      :items="selectItems"
      label="période"
      style="max-width: 360px;"
      hide-details
      outlined
      dense
      class="mr-4"
      @input="setPeriod"
      @change="input"
    />
    <filter-date-picker
      v-model="period.start"
      label="début"
      @input="input"
    />
    <filter-date-picker
      v-model="period.end"
      label="fin"
      @input="input"
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
            start: this.$day().subtract(6, 'days').format('YYYY-MM-DD'),
            end: this.$day().format('YYYY-MM-DD')
          }
        },
        {
          text: 'dernière semaine (du lundi au dimanche)',
          value: {
            start: this.$day().startOf('week').subtract(7, 'days').format('YYYY-MM-DD'),
            end: this.$day().startOf('week').subtract(1, 'days').format('YYYY-MM-DD')
          }
        },
        {
          text: '30 derniers jours',
          value: {
            start: this.$day().subtract(29, 'days').format('YYYY-MM-DD'),
            end: this.$day().format('YYYY-MM-DD')
          }
        },
        {
          text: 'dernier mois écoulé',
          value: {
            start: this.$day().startOf('month').subtract(1, 'days').startOf('month').format('YYYY-MM-DD'),
            end: this.$day().startOf('month').subtract(1, 'days').format('YYYY-MM-DD')
          }
        },
        {
          text: '360 derniers jours',
          value: {
            start: this.$day().subtract(359, 'days').format('YYYY-MM-DD'),
            end: this.$day().format('YYYY-MM-DD')
          }
        },
        {
          text: 'période personnalisée',
          value: null
        }
      ]
    }
  },
  mounted () {
    this.period = { ...this.selectItems[0].value }
    this.input()
  },
  methods: {
    setPeriod (value) {
      if (value) {
        this.period = { ...value }
        this.input()
      }
    },
    input () {
      const duration = this.$day(this.period.end).diff(this.period.start, 'day')
      this.$emit('input', {
        previous: {
          start: this.$day(this.period.start).subtract(duration + 1, 'days').format('YYYY-MM-DD'),
          end: this.$day(this.period.start).subtract(1, 'days').format('YYYY-MM-DD')
        },
        current: { ...this.period }
      })
    }
  }
}
</script>

<style>

</style>
