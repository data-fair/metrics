<template>
  <layout-resizable-card
    v-model="large"
    :title="title"
  >
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
  </layout-resizable-card>
</template>

<script>
import Vue from 'vue'
import safeDecodeUriComponent from '~/assets/safe-decode-uri-component.js'
const truncateMiddle = require('truncate-middle')

const userClasses = {
  anonymous: 'anonyme',
  owner: 'propriétaire',
  external: 'utilisateur externe',
  ownerAPIKey: 'propriétaire (clé d\'API)',
  externalAPIKey: 'utilisateur externe (clé d\'API)'
}

const getLabel = (serie, category, labels) => {
  if (serie.label) return serie.label
  if (category === 'resource') return safeDecodeUriComponent(serie.key.resource.title)
  if (category === 'userClass') return userClasses[serie.key.userClass] || serie.key.userClass
  if (serie.key[category] === 'none') return 'inconnu'
  if (labels && labels[serie.key[category]]) return labels[serie.key[category]]
  return serie.key[category]
}

export default {
  props: {
    title: { type: String, required: true },
    category: { type: String, default: 'resource' },
    filter: { type: Object, required: true },
    periods: { type: Object, required: true },
    labels: { type: Object, required: false, default: null }
  },
  data () {
    return {
      aggResult: null,
      aggResultPrevious: null,
      loading: false,
      large: false
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

      const series = [...this.aggResult.series]
      // splice removes the forst items and returns them
      const limitedSeries = series.splice(0, this.large ? 19 : 9)
      if (series.length) {
        limitedSeries.push({
          key: 'others',
          label: `${series.length} autre(s)`,
          nbRequests: series.reduce((nbRequests, s) => nbRequests + s.nbRequests, 0),
          bytes: series.reduce((bytes, s) => bytes + s.bytes, 0),
          previousNbRequests: series.reduce((previousNbRequests, s) => previousNbRequests + s.previousNbRequests, 0),
          previousBytes: series.reduce((previousBytes, s) => previousBytes + s.previousBytes, 0)
        })
      }

      const categories = limitedSeries
        .map(s => ({
          label: getLabel(s, this.category, this.labels),
          value: s.nbRequests,
          previousValue: s.previousNbRequests,
          tooltip: `${s.nbRequests.toLocaleString()} requête(s) cumulant ${Vue.filter('displayBytes')(s.bytes, this.$i18n.locale)}`,
          previousTooltip: `${s.previousNbRequests.toLocaleString()} requête(s) cumulant ${Vue.filter('displayBytes')(s.previousBytes, this.$i18n.locale)} sur période précédente`
        }))
      const vuetify = this.$vuetify
      return {
        type: 'bar',
        data: {
          labels: categories.map(c => c.label),
          datasets: [{
            label: 'Période en cours',
            data: categories.map(c => c.value),
            backgroundColor: this.$vuetify.theme.themes.light.accent,
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
            },
            y: {
              ticks: {
                precision: 0,
                callback (value, index) {
                  return truncateMiddle(categories[index].label, vuetify.breakpoint.mdAndUp ? 20 : 10, 10, '...')
                }
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
      this.fetch()
    },
    async filter (oldValue, newValue) {
      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return
      this.fetch()
    },
    chartConfig () {
      if (this.chart) {
        this.chart.options = this.chartConfig.options
        this.chart.data = this.chartConfig.data
        this.chart.update()
      }
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
    async fetch () {
      this.loading = true
      const [aggResult, aggResultPrevious] = await Promise.all([
        this.fetchPeriod(this.periods.current),
        this.fetchPeriod(this.periods.previous)
      ])
      this.$emit('input-agg', {
        current: JSON.parse(JSON.stringify(aggResult)),
        previous: JSON.parse(JSON.stringify(aggResultPrevious))
      })
      aggResult.series.forEach(serie => {
        const matchingPreviousSerie = aggResultPrevious.series.find(ps => {
          if (this.category === 'resource') return ps.key.resource.id === serie.key.resource.id
          else return ps.key[this.category] === serie.key[this.category]
        })
        if (!matchingPreviousSerie) {
          serie.previousNbRequests = 0
          serie.previousBytes = 0
        } else {
          serie.previousNbRequests = matchingPreviousSerie.nbRequests
          serie.previousBytes = matchingPreviousSerie.bytes
        }
      })
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
      return aggResult
    }
  }
}
</script>

<style>

</style>
