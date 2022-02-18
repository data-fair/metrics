<template>
  <v-card flat>
    <v-card-title class="text-overline primary--text text--darken-2 justify-center pa-0">
      {{ title }}
    </v-card-title>
    <v-card-text>
      <canvas :id="id + '-canvas'" />
    </v-card-text>
  </v-card>
</template>

<script>
import Vue from 'vue'

const limit = 2

export default {
  props: {
    title: { type: String, required: true },
    category: { type: String, default: 'resource' },
    filter: { type: Object, required: true },
    periods: { type: Object, required: true }
  },
  data () {
    return {
      aggResult: null
    }
  },
  computed: {
    id () {
      return `chart-categories-${this.category}-${JSON.stringify(this.filter).replace(/[{}"]/g, '').replace(/[,:]/g, '-')}`
    },
    chartConfig () {
      if (!this.aggResult) return
      const categories = this.aggResult.series
        .map(s => ({
          label: s.label || decodeURIComponent(this.category === 'resource' ? s.key.resource.title : s.key.resource),
          value: s.nbRequests,
          tooltip: `${s.nbRequests.toLocaleString()} requête(s) cumulant ${Vue.filter('displayBytes')(s.bytes, this.$i18n.locale)}`
        }))
      return {
        type: 'bar',
        data: {
          labels: categories.map(c => c.label),
          datasets: [{
            label: 'Période en cours',
            data: categories.map(c => c.value),
            backgroundColor: this.$vuetify.theme.themes.light.primary,
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          locale: this.$i18n.locale,
          aspectRatio: this.$vuetify.breakpoint.smAndDown ? 1 : 2,
          scales: {
            x: {
              beginAtZero: true,
              ticks: {
                precision: 0
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: (tooltipItem) => {
                  return categories[tooltipItem.dataIndex].tooltip
                }
              }
            }
          }
        }
      }
    }
  },
  watch: {
    async periods () {
      this.update()
    },
    async filter (oldValue, newValue) {
      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return
      this.update()
    }
  },
  destroyed () {
    if (this.chart) this.chart.destroy()
  },
  async mounted () {
    await this.fetch()
    this.chart = new this.$Chart(document.getElementById(this.id + '-canvas'), this.chartConfig)
  },
  methods: {
    async update () {
      await this.fetch()
      this.chart.options = this.chartConfig.options
      this.chart.data = this.chartConfig.data
      this.chart.update()
    },
    async fetch () {
      const aggResult = await this.$axios.$get('api/v1/daily-api-metrics/_agg', {
        params: {
          split: this.category,
          ...this.filter,
          start: this.periods.current.start,
          end: this.periods.current.end
        }
      })

      this.$emit('input', { ...aggResult })

      const series = [...aggResult.series]
      // splice removes the forst items and returns them
      aggResult.series = series.splice(0, limit)
      if (series.length) {
        aggResult.series.push({
          key: 'others',
          label: `${series.length} autre(s)`,
          nbRequests: series.reduce((nbRequests, s) => nbRequests + s.nbRequests, 0),
          bytes: series.reduce((bytes, s) => bytes + s.bytes, 0)
        })
      }

      this.aggResult = aggResult
    }
  }
}
</script>

<style>

</style>
