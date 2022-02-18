<template>
  <v-container
    v-if="initialized && user"
    class="home my-0"
  >
    <v-app-bar
      dark
      color="primary"
      rounded
      class="mb-4"
    >
      <filter-period @input="v => periods = v" />
    </v-app-bar>
    <template v-if="periods">
      <v-row>
        <v-col
          cols="12"
          md="6"
        >
          <chart-categories
            title="Téléchargement de fichiers par jeu de données"
            category="resource"
            :filter="{statusClass: 'ok', operationTrack: 'readDataFiles'}"
            :periods="periods"
            @input-agg="v => aggResultDataFiles = v"
          />
        </v-col>
        <v-col
          cols="12"
          md="6"
        >
          <chart-categories
            title="Appels aux apis par jeu de données"
            category="resource"
            :filter="{statusClass: 'ok', operationTrack: 'readDataAPI'}"
            :periods="periods"
            @input-agg="v => aggResultDataAPI = v"
          />
        </v-col>
      </v-row>

      <v-app-bar
        dark
        color="primary"
        rounded
        class="mb-4"
      >
        <v-autocomplete
          v-model="dataset"
          :loading="!aggResultDataAPI"
          :items="datasetItems"
          outlined
          hide-details
          dense
          clearable
          label="ciblez un jeu de données"
          style="max-width: 500px;"
        />
      </v-app-bar>

      <v-row>
        <v-col
          v-for="(metric, i) in simpleMetrics"
          :key="i"
          cols="12"
          sm="4"
        >
          <chart-simple-metric
            :title="metric.title"
            :subtitle="metric.subtitle"
            :loading="metric.loading"
          />
        </v-col>
      </v-row>

      <v-row>
        <v-col
          cols="12"
          md="6"
        >
          <chart-date-histo
            title="Historique des téléchargements de fichiers"
            :filter="{...baseFilter, operationTrack: 'readDataFiles'}"
            :periods="periods"
          />
        </v-col>
        <v-col
          cols="12"
          md="6"
        >
          <chart-date-histo
            title="Historique des appels aux apis"
            :filter="{...baseFilter, operationTrack: 'readDataAPI'}"
            :periods="periods"
          />
        </v-col>
        <v-col
          cols="12"
          md="6"
        >
          <chart-categories
            title="Appels par site d'origine"
            category="refererDomain"
            :filter="baseFilter"
            :periods="periods"
          />
        </v-col>
        <v-col
          cols="12"
          md="6"
        >
          <chart-categories
            title="Appels par catégorie d'utilisateur"
            category="userClass"
            :filter="baseFilter"
            :periods="periods"
          />
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<i18n lang="yaml">
</i18n>

<script>
import Vue from 'vue'
const { mapState, mapActions, mapGetters } = require('vuex')

export default {
  components: {},
  data: () => ({
    periods: null,
    aggResultDataFiles: null,
    aggResultDataAPI: null,
    dataset: null
  }),
  computed: {
    ...mapState('session', ['user', 'initialized']),
    ...mapGetters('session', ['activeAccount']),
    datasetItems () {
      if (!this.aggResultDataAPI) return []
      return this.aggResultDataAPI.current.series
        .map(s => ({ text: `${decodeURIComponent(s.key.resource.title)} (${s.nbRequests.toLocaleString()})`, value: s.key.resource.id, serie: s }))
    },
    baseFilter () {
      const filter = { statusClass: 'ok' }
      if (this.dataset) filter.resourceId = this.dataset
      return filter
    },
    simpleMetricsSeries () {
      if (!this.aggResultDataFiles || !this.aggResultDataAPI) return null
      if (!this.dataset) return { dataFiles: this.aggResultDataFiles, dataAPI: this.aggResultDataAPI }
      const dataFiles = {
        previous: this.aggResultDataFiles.previous.series.find(s => s.key.resource.id === this.dataset),
        current: this.aggResultDataFiles.current.series.find(s => s.key.resource.id === this.dataset)
      }
      const dataAPI = {
        previous: this.aggResultDataAPI.previous.series.find(s => s.key.resource.id === this.dataset),
        current: this.aggResultDataAPI.current.series.find(s => s.key.resource.id === this.dataset)
      }
      return { dataFiles, dataAPI }
    },
    simpleMetrics () {
      if (!this.simpleMetricsSeries) return
      const simpleMetrics = []
      for (const operationType of ['dataFiles', 'dataAPI']) {
        for (const metricType of ['nbRequests', 'bytes']) {
          if (operationType === 'dataAPI' && metricType === 'bytes') continue
          if (this.simpleMetricsSeries[operationType]) {
            const current = this.simpleMetricsSeries[operationType].current
            if (!current) continue
            let title = ''
            if (metricType === 'nbRequests' && operationType === 'dataAPI') {
              title = current.nbRequests.toLocaleString() + ' appel(s) d\'API'
            }
            if (metricType === 'nbRequests' && operationType === 'dataFiles') {
              title = current.nbRequests.toLocaleString() + ' fichier(s)'
            }
            if (metricType === 'bytes' && operationType === 'dataFiles') {
              title = Vue.filter('displayBytes')(current.bytes, this.$i18n.locale) + ' fichiers'
            }
            let subtitle = 'rien sur la période précédente'
            const previous = this.simpleMetricsSeries[operationType].previous
            if (previous) {
              subtitle = metricType === 'nbRequests' ? previous.nbRequests.toLocaleString() : Vue.filter('displayBytes')(previous.bytes, this.$i18n.locale)
              subtitle += ' sur la période précédente'
            }
            simpleMetrics.push({ title, subtitle, loading: false })
          } else {
            simpleMetrics.push({ loading: true })
          }
        }
      }
      return simpleMetrics
    }
  },
  methods: {
    ...mapActions('session', ['login'])
  }
}
</script>
