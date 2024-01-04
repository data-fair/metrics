<template>
  <v-container
    class="home my-0"
    :fluid="$vuetify.display.lgAndDown"
    data-iframe-height
  >
    <v-toolbar
      variant="tonal"
      rounded
      :class="`mb-4 section-bar-${$vuetify.theme.current.dark ? 'dark' : 'light'}`"
    >
      <v-icon
        x-large
        color="primary"
        class="mx-4"
      >
        mdi-calendar-range
      </v-icon>
      <filter-period @update:model-value="v => periods = v" />
    </v-toolbar>
    <template v-if="periods">
      <v-row dense>
        <chart-categories
          title="Téléchargements / jeu de données"
          category="resource"
          :filter="{statusClass: 'ok', operationTrack: 'readDataFiles'}"
          :periods="periods"
          @update:agg="v => aggResultDataFiles = v"
        />
        <chart-categories
          title="Appels API / jeu de données"
          category="resource"
          :filter="{statusClass: 'ok', operationTrack: 'readDataAPI'}"
          :periods="periods"
          @update:agg="v => aggResultDataAPI = v"
        />
        <chart-categories
          title="Ouvertures de visualisations"
          category="resource"
          :filter="{statusClass: 'ok', operationTrack: 'openApplication'}"
          :periods="periods"
          @update:agg="v => aggResultOpenApp = v"
        />
      </v-row>

      <v-toolbar
        variant="tonal"
        rounded
        :class="`my-4 section-bar-${$vuetify.theme.current.dark ? 'dark' : 'light'}`"
      >
        <v-icon
          x-large
          color="primary"
          class="mx-4"
        >
          mdi-database
        </v-icon>
        <v-autocomplete
          v-model="dataset"
          :loading="!aggResultDataAPI"
          :items="datasetItems"
          hide-details
          variant="outlined"
          density="compact"
          clearable
          label="ciblez un jeu de données"
          style="max-width: 500px;"
        />
      </v-toolbar>

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

      <v-row dense>
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
        <chart-categories
          title="Requêtes / site d'origine"
          category="refererDomain"
          :filter="baseFilter"
          :periods="periods"
        />
        <chart-categories
          title="Requêtes / catégorie d'utilisateur"
          category="userClass"
          :filter="baseFilter"
          :periods="periods"
        />
        <chart-categories
          title="Requêtes / visualisation"
          category="refererApp"
          :filter="baseFilter"
          :periods="periods"
          :labels="appLabels"
        />
        <chart-categories
          title="Requêtes / traitement"
          category="processing"
          :filter="baseFilter"
          :periods="periods"
        />
      </v-row>
    </template>
  </v-container>
</template>

<i18n lang="yaml">
</i18n>

<script>
import formatBytes from '@data-fair/lib/format/bytes.js'
import safeDecodeUriComponent from '~/assets/safe-decode-uri-component.js'

export default {
  data: () => ({
    periods: null,
    /** @type {any} */
    aggResultDataFiles: null,
    /** @type {any} */
    aggResultDataAPI: null,
    /** @type {any} */
    aggResultOpenApp: null,
    dataset: null
  }),
  computed: {
    datasetItems () {
      if (!this.aggResultDataAPI) return []
      return this.aggResultDataAPI.current.series
        .map(s => ({ title: safeDecodeUriComponent(s.key.resource.title), value: s.key.resource.id, serie: s }))
    },
    baseFilter () {
      /** @type {any} */
      const filter = { statusClass: 'ok' }
      if (this.dataset) filter.resourceId = this.dataset
      return filter
    },
    /** @returns {any} */
    simpleMetricsSeries () {
      if (!this.aggResultDataFiles || !this.aggResultDataAPI) return null
      if (!this.dataset) return { dataFiles: this.aggResultDataFiles, dataAPI: this.aggResultDataAPI }
      const dataFiles = {
        previous: this.aggResultDataFiles.previous.series.find((/** @type {any} */s) => s.key.resource.id === this.dataset),
        current: this.aggResultDataFiles.current.series.find((/** @type {any} */s) => s.key.resource.id === this.dataset)
      }
      const dataAPI = {
        previous: this.aggResultDataAPI.previous.series.find((/** @type {any} */s) => s.key.resource.id === this.dataset),
        current: this.aggResultDataAPI.current.series.find((/** @type {any} */s) => s.key.resource.id === this.dataset)
      }
      return { dataFiles, dataAPI }
    },
    simpleMetrics () {
      if (!this.simpleMetricsSeries) return
      /** @type {any[]} */
      const simpleMetrics = []
      for (const operationType of ['dataFiles', 'dataAPI']) {
        for (const metricType of ['nbRequests', 'bytes']) {
          if (operationType === 'dataAPI' && metricType === 'bytes') continue
          if (operationType in this.simpleMetricsSeries) {
            const current = this.simpleMetricsSeries[operationType].current
            if (!current) continue
            /** @type {any} */
            const simpleMetric = { loading: false }
            if (metricType === 'nbRequests') simpleMetric.value = current.nbRequests.toLocaleString()
            else simpleMetric.value = formatBytes(current.bytes, this.$i18n.locale)

            if (operationType === 'dataAPI') simpleMetric.title = `appel${current.nbRequests > 1 ? 's' : ''} d'API`
            else simpleMetric.title = 'fichiers téléchargés'

            simpleMetric.subtitle = '0 sur période précédente'
            const previous = this.simpleMetricsSeries[operationType].previous
            if (previous) {
              simpleMetric.subtitle = metricType === 'nbRequests' ? previous.nbRequests.toLocaleString() : formatBytes(previous.bytes, this.$i18n.locale)
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
      /** @type {any} */
      const labels = {}
      this.aggResultOpenApp.previous.series.filter((/** @type {any} */item) => item.key.resource)
        .forEach((/** @type {any} */item) => {
          labels[item.key.resource.id] = item.key.resource.title
        })
      this.aggResultOpenApp.current.series.filter((/** @type {any} */item) => item.key.resource)
        .forEach((/** @type {any} */item) => {
          labels[item.key.resource.id] = item.key.resource.title
        })
      return labels
    }
  }
}
</script>

<style lang="css">
.section-bar-light{
  background: linear-gradient(90deg, rgba(255,255,255,1) 0%, rgba(245,245,245,1) 30%);
}
</style>
