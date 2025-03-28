<template>
  <layout-resizable-card
    :title="title"
    :aspect-ratio="aspectRatio"
    :loading="loading"
  >
    <canvas :id="id + '-canvas'" />
  </layout-resizable-card>
</template>

<script>
// @ts-nocheck
import formatBytes from '@data-fair/lib-vue/format/bytes.js'
import { useLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'

export default {
  props: {
    title: { type: String, required: true },
    filter: { type: Object, required: true },
    periods: { type: Object, required: true }
  },
  setup () {
    const { dayjs } = useLocaleDayjs()
    return { dayjs }
  },
  data () {
    return {
      aggResult: null,
      loading: false
    }
  },
  computed: {
    id () {
      return `chart-date-histo-${JSON.stringify(this.filter).replace(/[{}"]/g, '').replace(/[,:]/g, '-')}`
    },
    aspectRatio () {
      return this.$vuetify.display.smAndDown ? 1 : 2
    },
    chartConfig () {
      if (!this.aggResult) return
      const days = this.aggResult.days.map((day) => {
        const serieItem = this.aggResult.series[0].days[day]
        return {
          label: this.dayjs(day).format('L'),
          value: serieItem ? serieItem.nbRequests : 0,
          tooltip: serieItem ? `${serieItem.nbRequests.toLocaleString()} requêtes cumulant ${formatBytes(serieItem.bytes, this.$i18n.locale)}` : '0 requête'
        }
      })
      return {
        type: 'bar',
        data: {
          labels: days.map(c => c.label),
          datasets: [{
            label: 'Période en cours',
            data: days.map(c => c.value),
            backgroundColor: this.$vuetify.theme.current.colors.accent,
            borderRadius: 4
          }]
        },
        options: {
          locale: this.$i18n.locale,
          scales: {},
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: (tooltipItem) => {
                  return days[tooltipItem.dataIndex].tooltip
                }
              }
            }
          }
        }
      }
    }
  },
  watch: {
    periods () {
      this.update()
    },
    filter (oldValue, newValue) {
      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return
      this.update()
    }
  },
  unmounted () {
    if (this.chart) this.chart.destroy()
  },
  async mounted () {
    await this.fetch()
    if (this.chart) this.chart.destroy()
    this.chart = new chart.Chart(document.getElementById(this.id + '-canvas'), this.chartConfig)
  },
  methods: {
    async update () {
      await this.fetch()
      this.chart.options = this.chartConfig.options
      this.chart.data = this.chartConfig.data
      this.chart.update()
    },
    async fetch () {
      this.loading = true
      this.aggResult = await $fetch('daily-api-metrics/_agg', {
        query: { split: 'day', ...this.filter, start: this.periods.current.start, end: this.periods.current.end }
      })
      this.loading = false
    }
  }
}
</script>

<style>

</style>
