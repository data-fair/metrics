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
        size="x-large"
        color="primary"
        class="mx-4"
        :icon="mdiCalendarRange"
      />
      <filter-period @update:model-value="(v: any) => periods = v" />
      <v-spacer />
      <v-btn
        :prepend-icon="mdiTableArrowDown"
        class="mr-4"
        color="primary"
        variant="elevated"
        :href="exportUrl"
      >
        Exporter
      </v-btn>
    </v-toolbar>
    <tutorial-alert id="metrics-gzip">
      À partir de la 2e moitié de janvier 2024 la manière de compter les volumes de données téléchargés a changé.
      Auparavant, le volume était comptabilisé après la compression Gzip effectuée par le serveur web, maintenant c'est le volume brut qui est compté sans tenir compte de la compression.
      Cela peut avoir pour effet une augmentation soudaine des valeurs (jusqu'à x2 ou x3 en fonction de la nature des données).
    </tutorial-alert>
    <template v-if="periods">
      <v-row dense>
        <chart-categories
          title="Téléchargements / jeu de données"
          category="resource"
          :filter="{ statusClass: 'ok', operationTrack: 'readDataFiles' }"
          :periods="periods"
          @update:agg="(v: any) => aggResultDataFiles = v"
        />
        <chart-categories
          title="Appels API / jeu de données"
          category="resource"
          :filter="{ statusClass: 'ok', operationTrack: 'readDataAPI' }"
          :periods="periods"
          @update:agg="(v: any) => aggResultDataAPI = v"
        />
        <chart-categories
          title="Ouvertures de visualisations"
          category="resource"
          :filter="{ statusClass: 'ok', operationTrack: 'openApplication' }"
          :periods="periods"
          @update:agg="(v: any) => aggResultOpenApp = v"
        />
      </v-row>

      <v-toolbar
        variant="tonal"
        rounded
        :class="`my-4 section-bar-${$vuetify.theme.current.dark ? 'dark' : 'light'}`"
      >
        <v-icon
          size="x-large"
          color="primary"
          class="mx-4"
          :icon="mdiDatabase"
        />
        <v-autocomplete
          v-model="dataset"
          :loading="!aggResultDataAPI"
          :items="datasetItems"
          variant="outlined"
          density="compact"
          label="Cibler un jeu de données"
          max-width="500"
          hide-details
          clearable
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
            :trend="metric.trend"
          />
        </v-col>
      </v-row>

      <v-row dense>
        <chart-date-histo
          title="Historique téléchargements"
          :filter="{ ...baseFilter, operationTrack: 'readDataFiles' }"
          :periods="periods"
        />
        <chart-date-histo
          title="Historique appels API"
          :filter="{ ...baseFilter, operationTrack: 'readDataAPI' }"
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

<script setup lang="ts">
import { ref, computed } from 'vue'
import formatBytes from '@data-fair/lib-vue/format/bytes.js'
import tutorialAlert from '@data-fair/lib-vuetify/tutorial-alert.vue'

const periods = ref<any>(null)
const aggResultDataFiles = ref<any>(null)
const aggResultDataAPI = ref<any>(null)
const aggResultOpenApp = ref<any>(null)
const dataset = ref(null)

const datasetItems = computed(() => {
  if (!aggResultDataAPI.value) return []
  return aggResultDataAPI.value.current.series
    .map((s: any) => ({ title: safeDecodeUriComponent(s.key.resource.title), value: s.key.resource.id, serie: s }))
})

const baseFilter = computed(() => {
  const filter: any = { statusClass: 'ok' }
  if (dataset.value) filter.resourceId = dataset.value
  return filter
})

const simpleMetricsSeries = computed(() => {
  if (!aggResultDataFiles.value || !aggResultDataAPI.value) return null

  if (dataset.value) {
    const dataFiles = {
      previous: aggResultDataFiles.value.previous.series.find((s: any) => s.key.resource.id === dataset.value) || { nbRequests: 0, bytes: 0 },
      current: aggResultDataFiles.value.current.series.find((s: any) => s.key.resource.id === dataset.value) || { nbRequests: 0, bytes: 0 }
    }
    const dataAPI = {
      previous: aggResultDataAPI.value.previous.series.find((s: any) => s.key.resource.id === dataset.value) || { nbRequests: 0 },
      current: aggResultDataAPI.value.current.series.find((s: any) => s.key.resource.id === dataset.value) || { nbRequests: 0 }
    }

    return { dataFiles, dataAPI }
  }

  return { dataFiles: aggResultDataFiles.value, dataAPI: aggResultDataAPI.value }
})

const simpleMetrics = computed(() => {
  if (!simpleMetricsSeries.value) return
  const simpleMetrics: any[] = []
  for (const operationType of ['dataFiles', 'dataAPI'] as const) {
    for (const metricType of ['nbRequests', 'bytes']) {
      if (operationType === 'dataAPI' && metricType === 'bytes') continue
      if (operationType in simpleMetricsSeries.value) {
        const current = simpleMetricsSeries.value[operationType].current
        if (!current) continue
        const simpleMetric: any = { loading: false }
        if (metricType === 'nbRequests') simpleMetric.value = current.nbRequests.toLocaleString()
        else simpleMetric.value = formatBytes(current.bytes)

        if (operationType === 'dataAPI') simpleMetric.title = `appel${current.nbRequests > 1 ? 's' : ''} d'API`
        else simpleMetric.title = 'fichiers téléchargés'

        simpleMetric.subtitle = '0 sur période précédente'
        const previous = simpleMetricsSeries.value[operationType].previous
        if (previous) {
          simpleMetric.subtitle = metricType === 'nbRequests' ? previous.nbRequests.toLocaleString() : formatBytes(previous.bytes)
          simpleMetric.subtitle += ' sur période précédente'
          // Determine trend
          if (metricType === 'nbRequests') {
            if (current.nbRequests > previous.nbRequests) simpleMetric.trend = 'up'
            else if (current.nbRequests < previous.nbRequests) simpleMetric.trend = 'down'
            else simpleMetric.trend = 'neutral'
          } else {
            if (current.bytes > previous.bytes) simpleMetric.trend = 'up'
            else if (current.bytes < previous.bytes) simpleMetric.trend = 'down'
            else simpleMetric.trend = 'neutral'
          }
        }
        simpleMetrics.push(simpleMetric)
      } else {
        simpleMetrics.push({ loading: true })
      }
    }
  }
  return simpleMetrics
})

const appLabels = computed(() => {
  if (!aggResultOpenApp.value) return
  const labels: any = {}
  aggResultOpenApp.value.previous.series.filter((item: any) => item.key.resource)
    .forEach((item: any) => {
      labels[item.key.resource.id] = item.key.resource.title
    })
  aggResultOpenApp.value.current.series.filter((item: any) => item.key.resource)
    .forEach((item: any) => {
      labels[item.key.resource.id] = item.key.resource.title
    })
  return labels
})

const exportUrl = computed(() => {
  if (!periods.value) return undefined
  return `${$apiPath}/daily-api-metrics/_export?start=${periods.value.current.start}&end=${periods.value.current.end}`
})

</script>
