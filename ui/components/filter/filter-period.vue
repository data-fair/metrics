<template>
  <v-row class="ma-0 mb-2">
    <v-select
      :model-value="selectItems.find(si => !si.value || (si.value.start === period.start && si.value.end === period.end))"
      :items="selectItems"
      label="période"
      style="max-width: 360px;"
      hide-details
      outlined
      dense
      class="mr-4 mt-2"
      @update:model-value="setPeriod"
    />
    <filter-date-picker
      v-model="period.start"
      label="début"
      @update:model-value="input"
    />
    <filter-date-picker
      v-model="period.end"
      label="fin"
      @update:model-value="input"
    />
    <chart-legend />
  </v-row>
</template>

<script>
import { useLocaleDayjs } from '@data-fair/lib/vue/locale-dayjs.js'

export default {
  setup () {
    const { dayjs } = useLocaleDayjs()
    return { dayjs }
  },
  data () {
    const defaultSelectItem = {
      title: '7 derniers jours',
      value: {
        start: this.dayjs().subtract(6, 'days').format('YYYY-MM-DD'),
        end: this.dayjs().format('YYYY-MM-DD')
      }
    }
    const selectItems = [
      defaultSelectItem,
      {
        title: 'dernière semaine (du lundi au dimanche)',
        value: {
          start: this.dayjs().startOf('week').subtract(7, 'days').format('YYYY-MM-DD'),
          end: this.dayjs().startOf('week').subtract(1, 'days').format('YYYY-MM-DD')
        }
      },
      {
        title: '30 derniers jours',
        value: {
          start: this.dayjs().subtract(29, 'days').format('YYYY-MM-DD'),
          end: this.dayjs().format('YYYY-MM-DD')
        }
      },
      {
        title: 'dernier mois écoulé',
        value: {
          start: this.dayjs().startOf('month').subtract(1, 'days').startOf('month').format('YYYY-MM-DD'),
          end: this.dayjs().startOf('month').subtract(1, 'days').format('YYYY-MM-DD')
        }
      },
      {
        title: '360 derniers jours',
        value: {
          start: this.dayjs().subtract(359, 'days').format('YYYY-MM-DD'),
          end: this.dayjs().format('YYYY-MM-DD')
        }
      },
      {
        title: 'période personnalisée',
        value: null
      }
    ]
    return {
      selectItems,
      /** @type {{start: string, end: string}} */
      period: { ...defaultSelectItem.value }
    }
  },
  mounted () {
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
      const duration = this.dayjs(this.period.end).diff(this.period.start, 'day')
      this.$emit('update:modelValue', {
        previous: {
          start: this.dayjs(this.period.start).subtract(duration + 1, 'days').format('YYYY-MM-DD'),
          end: this.dayjs(this.period.start).subtract(1, 'days').format('YYYY-MM-DD')
        },
        current: { ...this.period }
      })
    }
  }
}
</script>

<style>

</style>
