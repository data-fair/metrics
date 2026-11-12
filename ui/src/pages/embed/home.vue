<template>
  <v-container data-iframe-height>
    <v-toolbar
      class="mb-4"
      variant="tonal"
      height="auto"
      rounded
    >
      <!-- two rows when the super admin view is on: the owner filter under the period fields, as wide as them -->
      <div class="d-flex align-start flex-wrap w-100">
        <div class="d-flex flex-column">
          <div class="toolbar-row">
            <v-icon
              :icon="mdiCalendarRange"
              class="mx-4"
              color="primary"
              size="x-large"
            />
          </div>
          <div
            v-if="adminMode && showAll"
            class="toolbar-row"
          >
            <v-icon
              :icon="mdiShieldAccount"
              class="mx-4"
              color="admin"
              size="x-large"
            />
          </div>
        </div>
        <div class="d-flex flex-column period-fields">
          <div class="toolbar-row">
            <filter-period @update:model-value="(v: any) => periods = v" />
          </div>
          <div
            v-if="adminMode && showAll"
            class="toolbar-row"
          >
            <v-autocomplete
              v-model="owners"
              :loading="ownerLoading"
              :items="ownerItems"
              variant="outlined"
              density="compact"
              label="Propriétaire"
              color="admin"
              class="mr-4"
              hide-details
              clearable
              multiple
              chips
              closable-chips
            />
          </div>
        </div>
        <div class="toolbar-row flex-shrink-0">
          <chart-legend />
        </div>
        <div class="toolbar-row ml-auto flex-shrink-0">
          <!-- super admin: the metrics of every account, optionally restricted to some owners -->
          <v-switch
            v-if="adminMode"
            v-model="showAll"
            color="admin"
            label="Voir tous les comptes"
            density="compact"
            class="ml-4 flex-grow-0 flex-shrink-0 text-admin text-no-wrap"
            hide-details
          />
          <v-btn
            :prepend-icon="mdiTableArrowDown"
            :href="exportUrl"
            class="mx-4"
            color="primary"
            variant="elevated"
          >
            Exporter
          </v-btn>
        </div>
      </div>
    </v-toolbar>
    <template v-if="periods">
      <template v-if="adminMode">
        <v-row
          v-if="showAll"
          class="mb-4"
          density="compact"
        >
          <chart-categories
            title="Appels API / propriétaire"
            category="owner"
            :filter="{ statusClass: 'ok', operationTrack: 'readDataAPI', ...adminFilter }"
            :periods="periods"
            :labels="ownerNames"
          />
          <chart-categories
            title="Téléchargements / propriétaire"
            category="owner"
            :filter="{ statusClass: 'ok', operationTrack: 'readDataFiles', ...adminFilter }"
            :periods="periods"
            :labels="ownerNames"
          />
          <chart-categories
            title="Ouvertures de visualisations / propriétaire"
            category="owner"
            :filter="{ statusClass: 'ok', operationTrack: 'openApplication', ...adminFilter }"
            :periods="periods"
            :labels="ownerNames"
          />
        </v-row>

        <!-- super admin: every request whatever its status, its volume and its error rate -->
        <template v-if="showAll">
          <v-row density="compact">
            <v-col
              v-for="(metric, i) in adminMetrics"
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
                :invert-trend="metric.invertTrend"
              />
            </v-col>
          </v-row>
          <v-row
            class="mb-4"
            density="compact"
          >
            <chart-categories
              title="Requêtes / classe de statut"
              category="statusClass"
              :filter="adminFilter"
              :periods="periods"
              :labels="statusClassLabels"
            />
            <chart-categories
              title="Volume / type d'opération"
              category="operationTrack"
              metric="bytes"
              :filter="adminFilter"
              :periods="periods"
              :labels="operationTrackLabels"
            />
            <chart-categories
              title="Volume / propriétaire"
              category="owner"
              metric="bytes"
              :filter="adminFilter"
              :periods="periods"
              :labels="ownerNames"
            />
          </v-row>
        </template>
      </template>

      <v-row density="compact">
        <chart-categories
          title="Téléchargements / jeu de données"
          category="resource"
          :filter="{ statusClass: 'ok', operationTrack: 'readDataFiles', ...adminFilter }"
          :periods="periods"
          @update:agg="(v: any) => aggResultDataFiles = v"
        />
        <chart-categories
          title="Appels API / jeu de données"
          category="resource"
          :filter="{ statusClass: 'ok', operationTrack: 'readDataAPI', ...adminFilter }"
          :periods="periods"
          @update:agg="(v: any) => aggResultDataAPI = v"
        />
        <chart-categories
          title="Ouvertures de visualisations"
          category="resource"
          :filter="{ statusClass: 'ok', operationTrack: 'openApplication', ...adminFilter }"
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
          label="Jeu de données"
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
          label="Site d'origine"
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
          label="Catégorie d'utilisateur"
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

      <v-row density="compact">
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
          title="Requêtes / consommateurs"
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
import { fetchOwnerNames, ownerKey, type OwnerRef } from '~/utils/owners'

const session = useSession()

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

const userClassLabels: Record<string, string> = {
  anonymous: 'Anonyme',
  owner: 'Propriétaire',
  external: 'Utilisateur externe',
  ownerAPIKey: "Propriétaire (clé d'API)",
  externalAPIKey: "Utilisateur externe (clé d'API)"
}

const refererCategoryLabels: Record<string, string> = {
  backoffice: 'Back-office',
  embed: 'Vues embarquées',
  app: 'Applications',
  mcp: 'MCP',
  other: 'Autre'
}

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
    if (value === 'none') title = 'Inconnu'
    if (value === null || value === undefined) title = 'Aucune'
    return { title, value }
  })
})

const userClassItems = computed(() => {
  if (!userClassAgg.value) return []
  return userClassAgg.value.series.map((serie: any) => {
    const value = serie.key.userClass
    return { title: userClassLabels[value] || value, value }
  })
})

// super admin view: the metrics of every account, optionally restricted to some owners
const adminMode = computed(() => !!session.user.value?.adminMode)
const showAll = useBooleanSearchParam('showAll')
const owners = useStringsArraySearchParam('owners')
const ownerAgg = ref<any>(null)
const ownerLoading = ref(false)
const ownerNames = ref<Record<string, string>>({})

const adminFilter = computed(() => {
  if (!adminMode.value || !showAll.value) return {}
  const filter: Record<string, any> = { showAll: 'true' }
  if (owners.value.length) filter.owner = owners.value
  return filter
})

const ownerItems = computed(() => {
  if (!ownerAgg.value) return []
  return ownerAgg.value.series.map((serie: any) => {
    const value = ownerKey(serie.key.owner)
    return { title: ownerNames.value[value] ?? serie.key.owner.id, value }
  })
})

watch(showAll, (value) => {
  if (!value) owners.value = []
})

const statusClassLabels: Record<string, string> = {
  info: 'Information (1xx)',
  ok: 'Succès (2xx)',
  redirect: 'Redirection (3xx)',
  clientError: 'Erreur client (4xx)',
  serverError: 'Erreur serveur (5xx)'
}

const operationTrackLabels: Record<string, string> = {
  readDataAPI: "Appels d'API",
  readDataFiles: 'Téléchargements',
  openApplication: 'Visualisations'
}

// totals by status class of the current and previous periods, whatever the status
const statusClassAgg = ref<{ current: any, previous: any } | null>(null)

watch([periods, adminFilter], async () => {
  if (!periods.value || !adminFilter.value.showAll) return
  statusClassAgg.value = null
  const fetchPeriod = (period: { start: string, end: string }) => $fetch('daily-api-metrics/_agg', {
    query: { split: 'statusClass', ...adminFilter.value, start: period.start, end: period.end }
  })
  try {
    const [current, previous] = await Promise.all([fetchPeriod(periods.value.current), fetchPeriod(periods.value.previous)])
    statusClassAgg.value = { current, previous }
  } catch {
    statusClassAgg.value = null
  }
}, { immediate: true, deep: true })

const getTrend = (current: number, previous: number) => current > previous ? 'up' : current < previous ? 'down' : 'neutral'
const formatRate = (rate: number) => rate.toLocaleString(undefined, { style: 'percent', maximumFractionDigits: 2 })

type AdminMetric = { loading?: boolean, value?: string, title?: string, subtitle?: string, trend?: string, invertTrend?: boolean }

const adminMetrics = computed<AdminMetric[]>(() => {
  if (!statusClassAgg.value) return Array.from({ length: 3 }, () => ({ loading: true }))
  const { current, previous } = statusClassAgg.value
  const classCount = (agg: any, statusClass: string) => agg.series.find((s: any) => s.key.statusClass === statusClass)?.nbRequests ?? 0
  const errorRate = (agg: any) => agg.nbRequests ? (classCount(agg, 'clientError') + classCount(agg, 'serverError')) / agg.nbRequests : 0
  const currentErrorRate = errorRate(current)
  const previousErrorRate = errorRate(previous)
  return [{
    value: current.nbRequests.toLocaleString(),
    title: `requête${current.nbRequests > 1 ? 's' : ''} (tous statuts)`,
    subtitle: `${previous.nbRequests.toLocaleString()} sur période précédente`,
    trend: getTrend(current.nbRequests, previous.nbRequests)
  }, {
    value: formatBytes(current.bytes),
    title: 'volume de données servi',
    subtitle: `${formatBytes(previous.bytes)} sur période précédente`,
    trend: getTrend(current.bytes, previous.bytes)
  }, {
    value: formatRate(currentErrorRate),
    title: "d'erreurs (4xx et 5xx)",
    subtitle: `${formatRate(previousErrorRate)} sur période précédente`,
    trend: getTrend(currentErrorRate, previousErrorRate),
    invertTrend: true
  }]
})

const baseFilter = computed(() => {
  const filter: any = { statusClass: 'ok', ...adminFilter.value }
  if (datasets.value.length) filter.resourceId = datasets.value
  if (refererDomains.value.length) filter.refererDomain = refererDomains.value
  if (userClasses.value.length) filter.userClass = userClasses.value
  return filter
})

const refererDomainOptionFilter = computed(() => {
  const filter: any = { statusClass: 'ok', ...adminFilter.value }
  if (datasets.value.length) filter.resourceId = datasets.value
  if (userClasses.value.length) filter.userClass = userClasses.value
  return filter
})

const userClassOptionFilter = computed(() => {
  const filter: any = { statusClass: 'ok', ...adminFilter.value }
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

watch([periods, adminMode, showAll], async () => {
  if (!adminMode.value || !showAll.value) return
  await fetchOptionAgg('owner', { statusClass: 'ok', showAll: 'true' }, ownerAgg, ownerLoading)
  const missing = (ownerAgg.value?.series ?? []).map((s: any) => s.key.owner as OwnerRef)
    .filter((owner: OwnerRef) => !(ownerKey(owner) in ownerNames.value))
  if (missing.length) ownerNames.value = { ...ownerNames.value, ...await fetchOwnerNames(missing) }
}, { immediate: true })

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

<style scoped>
.toolbar-row {
  display: flex;
  align-items: center;
  min-height: 64px;
}
/* the period fields keep their size (select from 200px to 400px, dates 150px each, with their
   right margins), the owner filter below takes the same width; the basis is the minimum so the
   column grows in the free space instead of pushing the rest of the bar to the next line */
.period-fields {
  flex: 1 1 548px;
  max-width: 748px;
}
</style>
