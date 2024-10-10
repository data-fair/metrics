<template>
  <v-container>
    <v-row>
      <v-col>
        <v-select
          v-model="metric"
          :items="metricItems"
          :return-object="false"
          label="Métrique"
        />
      </v-col>
      <v-col>
        <v-select
          v-model="split"
          :items="splitItems"
          :return-object="false"
          label="Groupé par"
        />
      </v-col>
      <v-col>
        <v-select
          v-model="filters.statusClass"
          :items="statusClasses"
          :return-object="false"
          label="Statut de la réponse"
        />
      </v-col>
      <v-col>
        <v-select
          v-model="filters.userClass"
          :items="userClasses"
          :return-object="false"
          label="Type d'utilisateur"
        />
      </v-col>
    </v-row>
    <div
      class="chart-container"
      data-iframe-height
    >
      <canvas id="chart" />
    </div>
  </v-container>
</template>

<script>
// @ts-nocheck
import { ref, reactive } from 'vue'
import { useLocaleDayjs } from '@data-fair/lib/vue/locale-dayjs.js'
import formatBytes from '@data-fair/lib/format/bytes.js'
// const palette = require('google-palette')('cb-Dark2', 8)

export default {
  setup () {
    const { dayjs } = useLocaleDayjs()
    const filters = reactive({ statusClass: 'ok', userClass: null })
    const split = ref('resource')

    const data = /** @type {import('vue').Ref<import('#api/doc').AggResult>} */(useFetch('daily-api-metrics/_agg', { query: { split, ...filters } }).data)
    return { split, filters, dayjs, aggResult: data }
  },
  data () {
    return {
      statusClasses: [
        { value: 'ok', text: 'ok' },
        { value: 'redirect', text: 'redirection (ok mais sans corps de réponse)' },
        { value: 'clientError', text: 'erreur de l\'appelant' },
        { value: 'serverError', text: 'erreur du serveur' }
      ],
      userClasses: [
        { value: null, text: 'tous' },
        { value: 'anonymous', text: 'anonyme' },
        { value: 'owner', text: 'propriétaire' },
        { value: 'external', text: 'utilisateur externe' },
        { value: 'ownerAPIKey', text: 'propriétaire (clé d\'API)' },
        { value: 'externalAPIKey', text: 'utilisateur externe (clé d\'API)' },
        { value: 'ownerProcessing', text: 'propriétaire (traitement)' },
        { value: 'externalProcessing', text: 'utilisateur externe (traitement)' }
      ],
      splitItems: [
        { value: 'resource', text: 'Jeu de données' },
        { value: 'refererDomain', text: 'Domaine d\'origine' },
        { value: 'operationTrack', text: 'Type de requête' }
      ],
      metric: 'nbRequests',
      metricItems: [
        { value: 'nbRequests', text: 'Nombre de requêtes' },
        { value: 'bytes', text: 'Volume de données' }
      ]
    }
  },
  computed: {
    chartConfig () {
      if (!this.aggResult) return
      return {
        type: 'bar',
        data: {
          labels: this.aggResult.days.map(day => this.dayjs(day).format('L')),
          datasets: this.aggResult.series
            .map(s => s)
            // @ts-expect-error this.metric is a string, we should type it more restrictively
            .sort((s1, s2) => s1[this.metric] - s2[this.metric])
            .map((serie, i) => ({
              label: {
                // @ts-ignore
                resource: key => decodeURIComponent(key.resource.title),
                // @ts-ignore
                refererDomain: key => key.refererDomain,
                // @ts-ignore
                operationTrack: key => ({
                  readDataAPI: 'API de données',
                  readDataFiles: 'Téléchargement de fichiers de données',
                  openApplication: 'Ouverture d\'une visualisation'
                }[key.operationTrack])
              }[this.split](serie.key),
              // @ts-ignore
              data: this.aggResult.days.map(day => serie.days[day] ? serie.days[day][this.metric] : 0),
              // @ts-ignore
              backgroundColor: palette[i] && ('#' + palette[i])
            }))
        },
        options: {
          locale: this.$i18n.locale,
          aspectRatio: this.$vuetify.display.smAndDown ? 1 : 2,
          scales: {
            y: {
              beginAtZero: true,
              stacked: true,
              ticks: this.metric === 'bytes'
                ? {
                    // @ts-ignore
                    callback: value => formatBytes(value, this.$i18n.locale)
                  }
                : undefined
            },
            x: {
              stacked: true
            }
          },
          plugins: {
            legend: {
              display: true
            }
          }
        }
      }
    }
  },
  watch: {
    chartConfig () {
      // @ts-ignore
      if (this.chart) this.chart.destroy()
      // @ts-ignore
      this.chart = new chart.Chart(document.getElementById('chart'), this.chartConfig)
    }
  },
  unmounted () {
    // @ts-ignore
    if (this.chart) this.chart.destroy()
  }
}
</script>

<style>

</style>
