<template>
  <v-container>
    <v-row>
      <v-col>
        <v-select
          v-model="metric"
          :items="metricItems"
          :return-object="false"
          label="Métrique"
          @change="render"
        />
      </v-col>
      <v-col>
        <v-select
          v-model="split"
          :items="splitItems"
          :return-object="false"
          label="Groupé par"
          @change="fetch"
        />
      </v-col>
      <v-col>
        <v-select
          v-model="filters.statusClass"
          :items="statusClasses"
          :return-object="false"
          label="Statut de la réponse"
          @change="fetch"
        />
      </v-col>
      <v-col>
        <v-select
          v-model="filters.userClass"
          :items="userClasses"
          :return-object="false"
          label="Type d'utilisateur"
          @change="fetch"
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
import { Chart, BarController, CategoryScale, LinearScale, BarElement, Legend } from 'chart.js'
// const palette = require('google-palette')('cb-Dark2', 8)

Chart.register(BarController, CategoryScale, LinearScale, BarElement, Legend)

export default {
  setup () {
    const { data } = useFetch('api/v1/daily-api-metrics/_agg', { query: { split: this.split, ...this.filters } })
    return { aggResult: data }
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
      filters: {
        statusClass: 'ok',
        userClass: null
      },
      split: 'resource',
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
          labels: this.aggResult.days.map(day => this.$day(day).format('L')),
          datasets: this.aggResult.series
            .map(s => s)
            .sort((s1, s2) => s1[this.metric] - s2[this.metric])
            .map((serie, i) => ({
              label: {
                resource: key => decodeURIComponent(key.resource.title),
                refererDomain: key => key.refererDomain,
                operationTrack: key => ({
                  readDataAPI: 'API de données',
                  readDataFiles: 'Téléchargement de fichiers de données',
                  openApplication: 'Ouverture d\'une visualisation'
                }[key.operationTrack])
              }[this.split](serie.key),
              data: this.aggResult.days.map(day => serie.days[day] ? serie.days[day][this.metric] : 0),
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
                    callback: value => Vue.filter('displayBytes')(value, this.$i18n.locale)
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
      if (this.chart) this.chart.destroy()
      this.chart = new Chart(document.getElementById('chart'), this.chartConfig)
    }
  },
  unmounted () {
    if (this.chart) this.chart.destroy()
  }
}
</script>

<style>

</style>