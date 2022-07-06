<template>
  <v-container
    v-if="initialized && user"
    class="home my-0"
    :fluid="$vuetify.breakpoint.lgAndDown"
    data-iframe-height
  >
    <v-app-bar
      :color="$vuetify.theme.dark ? 'transparent' : 'grey lighten-4'"
      rounded
      flat
      outlined
      :class="`mb-4 section-bar-${$vuetify.theme.dark ? 'dark' : 'light'}`"
      height="auto"
    >
      <v-icon
        x-large
        color="primary"
        class="mr-4"
      >
        mdi-calendar-range
      </v-icon>
      <filter-period @input="v => periods = v" />
    </v-app-bar>
    <template v-if="periods">
      <v-row>
        <chart-categories
          title="Téléchargements / jeu de données"
          category="resource"
          :filter="{statusClass: 'ok', operationTrack: 'readDataFiles'}"
          :periods="periods"
          @input-agg="v => aggResultDataFiles = v"
        />
        <chart-categories
          title="Appels API / jeu de données"
          category="resource"
          :filter="{statusClass: 'ok', operationTrack: 'readDataAPI'}"
          :periods="periods"
          @input-agg="v => aggResultDataAPI = v"
        />
        <chart-categories
          title="Ouvertures de visualisations"
          category="resource"
          :filter="{statusClass: 'ok', operationTrack: 'openApplication'}"
          :periods="periods"
          @input-agg="v => aggResultOpenApp = v"
        />
      </v-row>

      <v-app-bar
        :color="$vuetify.theme.dark ? 'transparent' : 'grey lighten-4'"
        rounded
        flat
        outlined
        :class="`my-4 section-bar-${$vuetify.theme.dark ? 'dark' : 'light'}`"
      >
        <v-icon
          x-large
          color="primary"
          class="mr-4"
        >
          mdi-database
        </v-icon>
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
            :value="metric.value"
            :title="metric.title"
            :subtitle="metric.subtitle"
            :loading="metric.loading"
          />
        </v-col>
      </v-row>

      <v-row>
        <chart-date-histo
          title="Historique téléchargements"
          :filter="{...baseFilter, operationTrack: 'readDataFiles'}"
          :periods="periods"
        />
        <chart-date-histo
          title="Historique appels API"
          :filter="{...baseFilter, operationTrack: 'readDataAPI'}"
          :periods="periods"
        />
      </v-row>
      <v-row>
        <chart-categories
          title="Requêtes / site d'origine"
          category="refererDomain"
          :filter="baseFilter"
          :periods="periods"
          :lg-cols="6"
        />
        <chart-categories
          title="Requêtes / catégorie d'utilisateur"
          category="userClass"
          :filter="baseFilter"
          :periods="periods"
          :lg-cols="6"
        />
        <chart-categories
          title="Requêtes / visualisation"
          category="refererApp"
          :filter="baseFilter"
          :periods="periods"
          :labels="appLabels"
          :lg-cols="6"
        />
        <chart-categories
          title="Requêtes / traitement"
          category="processing._id"
          :filter="baseFilter"
          :periods="periods"
          :lg-cols="6"
        />
      </v-row>
    </template>
  </v-container>
</template>

<i18n lang="yaml">
</i18n>

<script>
import Vue from 'vue'
import { mapState, mapActions, mapGetters } from 'vuex'
import safeDecodeUriComponent from '~/assets/safe-decode-uri-component.js'

export default {
  components: {},
  data: () => ({
    periods: null,
    aggResultDataFiles: null,
    aggResultDataAPI: null,
    aggResultOpenApp: null,
    dataset: null
  }),
  computed: {
    ...mapState('session', ['user', 'initialized']),
    ...mapGetters('session', ['activeAccount']),
    datasetItems () {
      if (!this.aggResultDataAPI) return []
      return this.aggResultDataAPI.current.series
        .map(s => ({ text: safeDecodeUriComponent(s.key.resource.title), value: s.key.resource.id, serie: s }))
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
          if (operationType in this.simpleMetricsSeries) {
            const current = this.simpleMetricsSeries[operationType].current
            if (!current) continue
            const simpleMetric = { loading: false }
            if (metricType === 'nbRequests') simpleMetric.value = current.nbRequests.toLocaleString()
            else simpleMetric.value = Vue.filter('displayBytes')(current.bytes, this.$i18n.locale)

            if (operationType === 'dataAPI') simpleMetric.title = `appel${current.nbRequests > 1 ? 's' : ''} d'API`
            else simpleMetric.title = 'fichiers téléchargés'

            simpleMetric.subtitle = '0 sur période précédente'
            const previous = this.simpleMetricsSeries[operationType].previous
            if (previous) {
              simpleMetric.subtitle = metricType === 'nbRequests' ? previous.nbRequests.toLocaleString() : Vue.filter('displayBytes')(previous.bytes, this.$i18n.locale)
              simpleMetric.subtitle += ' sur période précédente'
            }
            simpleMetrics.push(simpleMetric)
          } else {
            simpleMetrics.push({ loading: true })
          }
        }
      }
      return simpleMetrics
    },
    appLabels () {
      if (!this.aggResultOpenApp) return
      const labels = {}
      this.aggResultOpenApp.previous.series.filter(item => item.key.resource).forEach(item => {
        labels[item.key.resource.id] = item.key.resource.title
      })
      this.aggResultOpenApp.current.series.filter(item => item.key.resource).forEach(item => {
        labels[item.key.resource.id] = item.key.resource.title
      })
      return labels
    }
  },
  methods: {
    ...mapActions('session', ['login'])
  }
}
</script>

<style lang="css">
.section-bar-light{
  background: linear-gradient(90deg, rgba(255,255,255,1) 0%, rgba(245,245,245,1) 30%);
}
</style>
