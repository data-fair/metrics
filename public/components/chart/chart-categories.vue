<template>
  <v-card flat>
    <v-card-title class="text-overline primary--text text--darken-2 justify-center pa-0">
      {{ title }}
    </v-card-title>
    <v-card-text>
      <v-progress-linear
        :indeterminate="loading"
        background-opacity="0"
      />
      <v-responsive
        v-if="!chartConfig"
        :aspect-ratio="aspectRatio"
      />
      <canvas
        v-else
        :id="id + '-canvas'"
      />
    </v-card-text>
  </v-card>
</template>

<script>
import Vue from 'vue'

const limit = 10

const getLabel = (serie, category) => {
  if (serie.label) return serie.label
  if (category === 'resource') return decodeURIComponent(serie.key.resource.title)
  if (serie.key[category] === 'none') return 'inconnu'
  return serie.key[category]
}

export default {
  props: {
    title: { type: String, required: true },
    category: { type: String, default: 'resource' },
    filter: { type: Object, required: true },
    periods: { type: Object, required: true }
  },
  data () {
    return {
      aggResult: null,
      aggResultPrevious: null,
      loading: false
    }
  },
  computed: {
    id () {
      return `chart-categories-${this.category}-${JSON.stringify(this.filter).replace(/[{}"]/g, '').replace(/[,:]/g, '-')}`
    },
    aspectRatio () {
      return this.$vuetify.breakpoint.smAndDown ? 1 : 2
    },
    chartConfig () {
      if (!this.aggResult) return
      const categories = this.aggResult.series
        .map(s => ({
          label: getLabel(s, this.category),
          value: s.nbRequests,
          previousValue: s.previousNbRequests,
          tooltip: `${s.nbRequests.toLocaleString()} requête(s) cumulant ${Vue.filter('displayBytes')(s.bytes, this.$i18n.locale)}`,
          previousTooltip: `${s.previousNbRequests.toLocaleString()} requête(s) cumulant ${Vue.filter('displayBytes')(s.previousBytes, this.$i18n.locale)} sur période précédente`,
          key: JSON.stringify(s.key)
        }))
      console.log(this.aggResultPrevious)
      return {
        type: 'bar',
        data: {
          labels: categories.map(c => c.label),
          datasets: [{
            label: 'Période en cours',
            data: categories.map(c => c.value),
            backgroundColor: this.$vuetify.theme.themes.light.primary,
            borderRadius: 4
          }, {
            label: 'Période précédente',
            data: categories.map(c => c.previousValue),
            backgroundColor: '#9E9E9E',
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          locale: this.$i18n.locale,
          aspectRatio: this.aspectRatio,
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
                  return tooltipItem.datasetIndex === 1 ? categories[tooltipItem.dataIndex].previousTooltip : categories[tooltipItem.dataIndex].tooltip
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
      this.loading = true
      const [aggResult, aggResultPrevious] = await Promise.all([
        this.fetchPeriod(this.periods.current),
        this.fetchPeriod(this.periods.previous)
      ])
      aggResult.series.forEach(serie => {
        const matchingPreviousSerie = aggResultPrevious.series.find(ps => JSON.stringify(ps.key) === JSON.stringify(serie.key))
        if (!matchingPreviousSerie) {
          serie.previousNbRequests = 0
          serie.previousBytes = 0
        } else {
          serie.previousNbRequests = matchingPreviousSerie.nbRequests
          serie.previousBytes = matchingPreviousSerie.bytes
        }
      })
      const series = [...aggResult.series]
      // splice removes the forst items and returns them
      aggResult.series = series.splice(0, limit)
      if (series.length) {
        aggResult.series.push({
          key: 'others',
          label: `${series.length} autre(s)`,
          nbRequests: series.reduce((nbRequests, s) => nbRequests + s.nbRequests, 0),
          bytes: series.reduce((bytes, s) => bytes + s.bytes, 0),
          previousNbRequests: series.reduce((previousNbRequests, s) => previousNbRequests + s.previousNbRequests, 0),
          previousBytes: series.reduce((previousBytes, s) => previousBytes + s.previousBytes, 0)
        })
      }

      this.aggResult = aggResult
      this.loading = false
    },
    async fetchPeriod (period) {
      const aggResult = await this.$axios.$get('api/v1/daily-api-metrics/_agg', {
        params: {
          split: this.category,
          ...this.filter,
          start: period.start,
          end: period.end
        }
      })

      this.$emit('input', { ...aggResult })
      return aggResult
    }
  }
}
</script>

<style>

</style>
