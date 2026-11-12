<template>
  <!-- the audience of one dataset or application, in a tab of its page in data-fair: the iframe grows with its content -->
  <v-container
    data-iframe-height
    fluid
  >
    <v-toolbar
      class="mb-4"
      variant="tonal"
      height="auto"
      rounded
    >
      <div class="d-flex align-center flex-wrap w-100 py-2">
        <v-icon
          :icon="mdiCalendarRange"
          class="mx-4"
          color="primary"
          size="x-large"
        />
        <div class="d-flex align-center flex-grow-1 period-fields">
          <filter-period @update:model-value="(v: any) => periods = v" />
        </div>
        <chart-legend class="flex-shrink-0" />
      </div>
    </v-toolbar>

    <template v-if="periods">
      <v-row density="compact">
        <v-col
          v-for="(metric, i) in metrics"
          :key="i"
          cols="12"
          sm="4"
        >
          <chart-simple-metric v-bind="metric" />
        </v-col>
      </v-row>

      <v-row density="compact">
        <template v-if="resourceType === 'datasets'">
          <chart-date-histo
            :title="t('chartTitles.downloadsHistory')"
            :filter="{ ...resourceFilter, operationTrack: 'readDataFiles' }"
            :periods="periods"
          />
          <chart-date-histo
            :title="t('chartTitles.apiCallsHistory')"
            :filter="{ ...resourceFilter, operationTrack: 'readDataAPI' }"
            :periods="periods"
          />
          <chart-categories
            :title="t('chartTitles.requestsByApplication')"
            category="refererApp"
            :filter="resourceFilter"
            :periods="periods"
            :labels="appTitles"
            @update:agg="(agg: any) => fetchAppTitles(agg)"
          />
          <chart-categories
            :title="t('chartTitles.requestsByRefererDomain')"
            category="refererDomain"
            :filter="resourceFilter"
            :periods="periods"
          />
          <chart-categories
            :title="t('chartTitles.requestsByUserClass')"
            category="userClass"
            :filter="resourceFilter"
            :periods="periods"
          />
          <chart-categories
            :title="t('chartTitles.requestsByRefererCategory')"
            category="refererCategory"
            :filter="resourceFilter"
            :periods="periods"
            :labels="refererCategoryLabels"
          />
        </template>
        <template v-else>
          <chart-date-histo
            :title="t('chartTitles.openingsHistory')"
            :filter="{ ...resourceFilter, operationTrack: 'openApplication' }"
            :periods="periods"
          />
          <chart-date-histo
            :title="t('chartTitles.apiCallsViaAppHistory')"
            :filter="{ ...viaAppFilter, operationTrack: 'readDataAPI' }"
            :periods="periods"
          />
          <chart-categories
            :title="t('chartTitles.apiCallsByDataset')"
            category="resource"
            :filter="{ ...viaAppFilter, operationTrack: 'readDataAPI' }"
            :periods="periods"
          />
          <chart-categories
            :title="t('chartTitles.openingsByRefererDomain')"
            category="refererDomain"
            :filter="resourceFilter"
            :periods="periods"
          />
          <chart-categories
            :title="t('chartTitles.openingsByUserClass')"
            category="userClass"
            :filter="resourceFilter"
            :periods="periods"
          />
          <chart-categories
            :title="t('chartTitles.openingsByRefererCategory')"
            category="refererCategory"
            :filter="resourceFilter"
            :periods="periods"
            :labels="refererCategoryLabels"
          />
        </template>
      </v-row>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import formatBytes from '@data-fair/lib-vue/format/bytes.js'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  resourceType: 'datasets' | 'applications'
  resourceId: string
}>()

const { t, locale } = useI18n()

const refererCategoryLabels = computed<Record<string, string>>(() => Object.fromEntries(
  ['backoffice', 'embed', 'app', 'mcp', 'other'].map(key => [key, t(`refererCategories.${key}`)])
))

const periods = ref<any>(null)

const resourceFilter = computed(() => ({
  statusClass: 'ok',
  resourceType: props.resourceType,
  resourceId: props.resourceId
}))

// the requests sent from the pages of an application, to the datasets it shows
const viaAppFilter = computed(() => ({
  statusClass: 'ok',
  refererApp: props.resourceId
}))

type MetricDef = { title: string, filter: Record<string, any>, metric: 'nbRequests' | 'bytes' }
type Metric = { loading?: boolean, value?: string, title?: string, subtitle?: string, trend?: string }

const metricDefs = computed<MetricDef[]>(() => {
  if (props.resourceType === 'datasets') {
    return [
      { title: t('metrics.downloadedFiles'), filter: { ...resourceFilter.value, operationTrack: 'readDataFiles' }, metric: 'nbRequests' },
      { title: t('metrics.downloadedVolume'), filter: { ...resourceFilter.value, operationTrack: 'readDataFiles' }, metric: 'bytes' },
      { title: t('metrics.apiCalls'), filter: { ...resourceFilter.value, operationTrack: 'readDataAPI' }, metric: 'nbRequests' }
    ]
  }
  return [
    { title: t('metrics.openings'), filter: { ...resourceFilter.value, operationTrack: 'openApplication' }, metric: 'nbRequests' },
    { title: t('metrics.apiCallsViaApp'), filter: { ...viaAppFilter.value, operationTrack: 'readDataAPI' }, metric: 'nbRequests' },
    { title: t('metrics.loadedVolume'), filter: viaAppFilter.value, metric: 'bytes' }
  ]
})

const metricResults = ref<{ current: any, previous: any }[] | null>(null)

watch([periods, metricDefs], async () => {
  if (!periods.value) return
  metricResults.value = null
  const fetchTotals = (filter: Record<string, any>, period: { start: string, end: string }) => $fetch('daily-api-metrics/_agg', {
    query: { split: '', ...filter, start: period.start, end: period.end }
  })
  try {
    metricResults.value = await Promise.all(metricDefs.value.map(async (def) => {
      const [current, previous] = await Promise.all([fetchTotals(def.filter, periods.value.current), fetchTotals(def.filter, periods.value.previous)])
      return { current, previous }
    }))
  } catch {
    metricResults.value = null
  }
}, { immediate: true, deep: true })

const metrics = computed<Metric[]>(() => {
  if (!metricResults.value) return metricDefs.value.map(() => ({ loading: true }))
  return metricDefs.value.map((def, i) => {
    const current = metricResults.value![i].current[def.metric]
    const previous = metricResults.value![i].previous[def.metric]
    const format = (value: number) => def.metric === 'bytes' ? formatBytes(value, locale.value) : value.toLocaleString(locale.value)
    return {
      value: format(current),
      title: def.title,
      subtitle: t('onPreviousPeriod', { value: format(previous) }),
      trend: current > previous ? 'up' : current < previous ? 'down' : 'neutral'
    }
  })
})

// the referer applications are only known by their ids, their titles come from their own metrics
const appTitles = ref<Record<string, string>>({})
const fetchAppTitles = async (agg: any) => {
  const ids = [...new Set([...agg.current.series, ...agg.previous.series].map((s: any) => s.key.refererApp))]
    .filter((id: string) => id && !(id in appTitles.value))
  if (!ids.length) return
  const result: any = await $fetch('daily-api-metrics/_agg', {
    query: { split: 'resource', resourceType: 'applications', resourceId: ids, start: periods.value.previous.start, end: periods.value.current.end }
  })
  const titles: Record<string, string> = {}
  for (const serie of result.series) titles[serie.key.resource.id] = safeDecodeUriComponent(serie.key.resource.title)
  appTitles.value = { ...appTitles.value, ...titles }
}
</script>

<style scoped>
.period-fields {
  max-width: 748px;
}
</style>

<i18n lang="yaml">
en:
  onPreviousPeriod: "{value} over the previous period"
  metrics:
    downloadedFiles: downloaded files
    downloadedVolume: downloaded volume
    apiCalls: API calls
    openings: openings
    apiCallsViaApp: generated API calls
    loadedVolume: loaded data volume
  chartTitles:
    downloadsHistory: Downloads history
    apiCallsHistory: API calls history
    requestsByApplication: Requests / application
    requestsByRefererDomain: Requests / origin site
    requestsByUserClass: Requests / user category
    requestsByRefererCategory: Requests / consumers
    openingsHistory: Openings history
    apiCallsViaAppHistory: API calls history through the application
    apiCallsByDataset: API calls / dataset
    openingsByRefererDomain: Openings / origin site
    openingsByUserClass: Openings / user category
    openingsByRefererCategory: Openings / consumers
  refererCategories:
    backoffice: Back-office
    embed: Embedded views
    app: Applications
    mcp: MCP
    other: Other
fr:
  onPreviousPeriod: "{value} sur la période précédente"
  metrics:
    downloadedFiles: fichiers téléchargés
    downloadedVolume: volume téléchargé
    apiCalls: appels d'API
    openings: ouvertures
    apiCallsViaApp: appels d'API générés
    loadedVolume: volume de données chargé
  chartTitles:
    downloadsHistory: Historique téléchargements
    apiCallsHistory: Historique appels API
    requestsByApplication: Requêtes / visualisation
    requestsByRefererDomain: Requêtes / site d'origine
    requestsByUserClass: Requêtes / catégorie d'utilisateur
    requestsByRefererCategory: Requêtes / consommateurs
    openingsHistory: Historique ouvertures
    apiCallsViaAppHistory: Historique appels API via la visualisation
    apiCallsByDataset: Appels API / jeu de données
    openingsByRefererDomain: Ouvertures / site d'origine
    openingsByUserClass: Ouvertures / catégorie d'utilisateur
    openingsByRefererCategory: Ouvertures / consommateurs
  refererCategories:
    backoffice: Back-office
    embed: Vues embarquées
    app: Applications
    mcp: MCP
    other: Autre
</i18n>
