<template>
  <v-container data-iframe-height>
    <v-toolbar
      class="mb-4"
      variant="tonal"
      rounded
    >
      <v-icon
        :icon="mdiCalendarRange"
        class="mx-4"
        color="primary"
        size="x-large"
      />
      <filter-period @update:model-value="(v: any) => periods = v" />
      <v-spacer />
      <v-btn
        :prepend-icon="mdiTableArrowDown"
        :href="exportUrl"
        class="mx-4"
        color="primary"
        variant="elevated"
      >
        {{ t('export') }}
      </v-btn>
    </v-toolbar>
    <template v-if="periods">
      <v-row density="compact">
        <chart-categories
          :title="t('chartTitles.downloadsByDataset')"
          category="resource"
          :filter="{ statusClass: 'ok', operationTrack: 'readDataFiles' }"
          :periods="periods"
          @update:agg="(v: any) => aggResultDataFiles = v"
        />
        <chart-categories
          :title="t('chartTitles.apiCallsByDataset')"
          category="resource"
          :filter="{ statusClass: 'ok', operationTrack: 'readDataAPI' }"
          :periods="periods"
          @update:agg="(v: any) => aggResultDataAPI = v"
        />
        <chart-categories
          :title="t('chartTitles.applicationOpenings')"
          category="resource"
          :filter="{ statusClass: 'ok', operationTrack: 'openApplication' }"
          :periods="periods"
          @update:agg="(v: any) => aggResultOpenApp = v"
        />
      </v-row>

      <v-toolbar
        class="my-4"
        variant="tonal"
        height="auto"
        rounded
      >
        <v-icon
          :icon="mdiDatabase"
          class="mx-4"
          color="primary"
          size="x-large"
        />

        <!-- Dataset filter -->
        <v-autocomplete
          v-model="datasets"
          :loading="!aggResultDataAPI"
          :items="datasetItems"
          variant="outlined"
          density="compact"
          :label="t('dataset')"
          max-width="400"
          class="mr-4 my-2"
          hide-details
          clearable
          multiple
        >
          <template #selection="{ internalItem, index }">
            <div
              v-if="index === 0"
              class="d-flex overflow-hidden"
            >
              <span class="text-truncate flex-grow-1">{{ internalItem.title }}</span>
              <span
                v-if="datasets.length > 1"
                class="text-grey text-body-small align-self-center ml-1"
              >
                (+{{ datasets.length - 1 }})
              </span>
            </div>
          </template>
        </v-autocomplete>

        <!-- Referrer domain filter -->
        <v-autocomplete
          v-model="refererDomains"
          :loading="refererDomainLoading"
          :items="refererDomainItems"
          variant="outlined"
          density="compact"
          :label="t('refererDomain')"
          max-width="400"
          class="mr-4 my-2"
          hide-details
          clearable
          multiple
        >
          <template #selection="{ internalItem, index }">
            <span
              v-if="index === 0"
              class="d-flex overflow-hidden"
            >
              <span class="text-truncate flex-grow-1">{{ internalItem.title }}</span>
              <span
                v-if="refererDomains.length > 1"
                class="text-grey text-body-small align-self-center ml-1"
              >(+{{ refererDomains.length - 1 }})</span>
            </span>
          </template>
        </v-autocomplete>

        <!-- User class filter -->
        <v-autocomplete
          v-model="userClasses"
          :loading="userClassLoading"
          :items="userClassItems"
          variant="outlined"
          density="compact"
          :label="t('userClass')"
          max-width="400"
          class="mr-4 my-2"
          hide-details
          clearable
          multiple
        >
          <template #selection="{ internalItem, index }">
            <span
              v-if="index === 0"
              class="d-flex overflow-hidden"
            >
              <span class="text-truncate flex-grow-1">{{ internalItem.title }}</span>

              <span
                v-if="userClasses.length > 1"
                class="text-grey text-body-small align-self-center ml-1"
              >(+{{ userClasses.length - 1 }})</span>
            </span>
          </template>
        </v-autocomplete>
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

      <v-row density="compact">
        <chart-date-histo
          :title="t('chartTitles.downloadsHistory')"
          :filter="{ ...baseFilter, operationTrack: 'readDataFiles' }"
          :periods="periods"
        />
        <chart-date-histo
          :title="t('chartTitles.apiCallsHistory')"
          :filter="{ ...baseFilter, operationTrack: 'readDataAPI' }"
          :periods="periods"
        />
        <chart-categories
          :title="t('chartTitles.requestsByRefererDomain')"
          category="refererDomain"
          :filter="baseFilter"
          :periods="periods"
        />
        <chart-categories
          :title="t('chartTitles.requestsByUserClass')"
          category="userClass"
          :filter="baseFilter"
          :periods="periods"
        />
        <chart-categories
          :title="t('chartTitles.requestsByApplication')"
          category="refererApp"
          :filter="baseFilter"
          :periods="periods"
          :labels="appLabels"
        />
        <chart-categories
          :title="t('chartTitles.requestsByRefererCategory')"
          category="refererCategory"
          :filter="baseFilter"
          :periods="periods"
          :labels="refererCategoryLabels"
        />
      </v-row>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import formatBytes from '@data-fair/lib-vue/format/bytes.js'
import { useI18n } from 'vue-i18n'

const { t, te, locale } = useI18n()

const periods = ref<any>(null)
const aggResultDataFiles = ref<any>(null)
const aggResultDataAPI = ref<any>(null)
const aggResultOpenApp = ref<any>(null)
const simpleAggDataFiles = ref<any>(null)
const simpleAggDataAPI = ref<any>(null)
const datasets = useStringsArraySearchParam('datasets')
const refererDomains = useStringsArraySearchParam('refererDomains')
const userClasses = useStringsArraySearchParam('userClasses')
const refererDomainAgg = ref<any>(null)
const userClassAgg = ref<any>(null)
const refererDomainLoading = ref(false)
const userClassLoading = ref(false)

const refererCategoryLabels = computed<Record<string, string>>(() => ({
  backoffice: t('refererCategories.backoffice'),
  embed: t('refererCategories.embed'),
  app: t('refererCategories.app'),
  mcp: t('refererCategories.mcp'),
  other: t('refererCategories.other')
}))

const datasetItems = computed(() => {
  if (!aggResultDataAPI.value) return []
  return aggResultDataAPI.value.current.series
    .map((s: any) => ({ title: safeDecodeUriComponent(s.key.resource.title), value: s.key.resource.id, serie: s }))
})

const refererDomainItems = computed(() => {
  if (!refererDomainAgg.value) return []
  return refererDomainAgg.value.series.map((serie: any) => {
    const value = serie.key.refererDomain
    let title = value
    if (value === 'none') title = t('unknown')
    if (value === null || value === undefined) title = t('none')
    return { title, value }
  })
})

const userClassItems = computed(() => {
  if (!userClassAgg.value) return []
  return userClassAgg.value.series.map((serie: any) => {
    const value = serie.key.userClass
    return { title: te(`userClasses.${value}`) ? t(`userClasses.${value}`) : value, value }
  })
})

const baseFilter = computed(() => {
  const filter: any = { statusClass: 'ok' }
  if (datasets.value.length) filter.resourceId = datasets.value
  if (refererDomains.value.length) filter.refererDomain = refererDomains.value
  if (userClasses.value.length) filter.userClass = userClasses.value
  return filter
})

const refererDomainOptionFilter = computed(() => {
  const filter: any = { statusClass: 'ok' }
  if (datasets.value.length) filter.resourceId = datasets.value
  if (userClasses.value.length) filter.userClass = userClasses.value
  return filter
})

const userClassOptionFilter = computed(() => {
  const filter: any = { statusClass: 'ok' }
  if (datasets.value.length) filter.resourceId = datasets.value
  if (refererDomains.value.length) filter.refererDomain = refererDomains.value
  return filter
})

const fetchOptionAgg = async (split: string, filter: Record<string, any>, target: typeof refererDomainAgg, loading: typeof refererDomainLoading) => {
  if (!periods.value?.current?.start || !periods.value?.current?.end) return
  loading.value = true
  try {
    target.value = await $fetch('daily-api-metrics/_agg', {
      query: {
        split,
        ...filter,
        start: periods.value.current.start,
        end: periods.value.current.end
      }
    })
  } catch {
    target.value = null
  } finally {
    loading.value = false
  }
}

const fetchSimpleAgg = async (operationTrack: string) => {
  if (!periods.value?.current?.start || !periods.value?.current?.end) return { current: null, previous: null }
  const [current, previous] = await Promise.all([
    $fetch('daily-api-metrics/_agg', {
      query: {
        split: 'resource',
        ...baseFilter.value,
        operationTrack,
        start: periods.value.current.start,
        end: periods.value.current.end
      }
    }),
    $fetch('daily-api-metrics/_agg', {
      query: {
        split: 'resource',
        ...baseFilter.value,
        operationTrack,
        start: periods.value.previous.start,
        end: periods.value.previous.end
      }
    })
  ])
  return { current, previous }
}

const simpleMetricsSeries = computed(() => {
  if (!simpleAggDataFiles.value?.current || !simpleAggDataAPI.value?.current) return null

  if (datasets.value.length) {
    const sumSeries = (series: any[], ids: string[]) => ids.reduce((acc, id) => {
      const match = series.find((s: any) => s.key.resource.id === id)
      if (!match) return acc
      acc.nbRequests += match.nbRequests || 0
      acc.bytes += match.bytes || 0
      return acc
    }, { nbRequests: 0, bytes: 0 })

    const dataFiles = {
      previous: sumSeries(simpleAggDataFiles.value.previous.series, datasets.value),
      current: sumSeries(simpleAggDataFiles.value.current.series, datasets.value)
    }
    const dataAPI = {
      previous: sumSeries(simpleAggDataAPI.value.previous.series, datasets.value),
      current: sumSeries(simpleAggDataAPI.value.current.series, datasets.value)
    }

    return { dataFiles, dataAPI }
  }

  return {
    dataFiles: {
      current: {
        nbRequests: simpleAggDataFiles.value.current.nbRequests,
        bytes: simpleAggDataFiles.value.current.bytes
      },
      previous: {
        nbRequests: simpleAggDataFiles.value.previous.nbRequests,
        bytes: simpleAggDataFiles.value.previous.bytes
      }
    },
    dataAPI: {
      current: {
        nbRequests: simpleAggDataAPI.value.current.nbRequests,
        bytes: simpleAggDataAPI.value.current.bytes
      },
      previous: {
        nbRequests: simpleAggDataAPI.value.previous.nbRequests,
        bytes: simpleAggDataAPI.value.previous.bytes
      }
    }
  }
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
        if (metricType === 'nbRequests') simpleMetric.value = current.nbRequests.toLocaleString(locale.value)
        else simpleMetric.value = formatBytes(current.bytes, locale.value)

        if (operationType === 'dataAPI') simpleMetric.title = t('apiCalls', current.nbRequests)
        else simpleMetric.title = t('downloadedFiles', current.nbRequests)

        simpleMetric.subtitle = t('onPreviousPeriod', { value: (0).toLocaleString(locale.value) })
        const previous = simpleMetricsSeries.value[operationType].previous
        if (previous) {
          simpleMetric.subtitle = t('onPreviousPeriod', {
            value: metricType === 'nbRequests' ? previous.nbRequests.toLocaleString(locale.value) : formatBytes(previous.bytes, locale.value)
          })
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

watch([periods, refererDomainOptionFilter], async () => {
  await fetchOptionAgg('refererDomain', refererDomainOptionFilter.value, refererDomainAgg, refererDomainLoading)
}, { immediate: true, deep: true })

watch([periods, userClassOptionFilter], async () => {
  await fetchOptionAgg('userClass', userClassOptionFilter.value, userClassAgg, userClassLoading)
}, { immediate: true, deep: true })

watch([periods, baseFilter], async () => {
  const [dataFiles, dataAPI] = await Promise.all([
    fetchSimpleAgg('readDataFiles'),
    fetchSimpleAgg('readDataAPI')
  ])
  simpleAggDataFiles.value = dataFiles
  simpleAggDataAPI.value = dataAPI
}, { immediate: true, deep: true })

</script>

<style scoped></style>

<i18n lang="yaml">
en:
  export: Export
  dataset: Dataset
  refererDomain: Origin site
  userClass: User category
  unknown: Unknown
  none: None
  apiCalls: API calls | API call | API calls
  downloadedFiles: downloaded files | downloaded file | downloaded files
  onPreviousPeriod: "{value} over the previous period"
  chartTitles:
    downloadsByDataset: Downloads / dataset
    apiCallsByDataset: API calls / dataset
    applicationOpenings: Application openings
    downloadsHistory: Downloads history
    apiCallsHistory: API calls history
    requestsByRefererDomain: Requests / origin site
    requestsByUserClass: Requests / user category
    requestsByApplication: Requests / application
    requestsByRefererCategory: Requests / consumers
  userClasses:
    anonymous: Anonymous
    owner: Owner
    external: External user
    ownerAPIKey: Owner (API key)
    externalAPIKey: External user (API key)
  refererCategories:
    backoffice: Back-office
    embed: Embedded views
    app: Applications
    mcp: MCP
    other: Other
fr:
  export: Exporter
  dataset: Jeu de données
  refererDomain: Site d'origine
  userClass: Catégorie d'utilisateur
  unknown: Inconnu
  none: Aucune
  apiCalls: appel d'API | appel d'API | appels d'API
  downloadedFiles: fichier téléchargé | fichier téléchargé | fichiers téléchargés
  onPreviousPeriod: "{value} sur la période précédente"
  chartTitles:
    downloadsByDataset: Téléchargements / jeu de données
    apiCallsByDataset: Appels API / jeu de données
    applicationOpenings: Ouvertures de visualisations
    downloadsHistory: Historique téléchargements
    apiCallsHistory: Historique appels API
    requestsByRefererDomain: Requêtes / site d'origine
    requestsByUserClass: Requêtes / catégorie d'utilisateur
    requestsByApplication: Requêtes / visualisation
    requestsByRefererCategory: Requêtes / consommateurs
  userClasses:
    anonymous: Anonyme
    owner: Propriétaire
    external: Utilisateur externe
    ownerAPIKey: Propriétaire (clé d'API)
    externalAPIKey: Utilisateur externe (clé d'API)
  refererCategories:
    backoffice: Back-office
    embed: Vues embarquées
    app: Applications
    mcp: MCP
    other: Autre
</i18n>
