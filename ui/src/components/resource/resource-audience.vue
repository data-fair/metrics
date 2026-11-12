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
            title="Historique téléchargements"
            :filter="{ ...resourceFilter, operationTrack: 'readDataFiles' }"
            :periods="periods"
          />
          <chart-date-histo
            title="Historique appels API"
            :filter="{ ...resourceFilter, operationTrack: 'readDataAPI' }"
            :periods="periods"
          />
          <chart-categories
            title="Requêtes / visualisation"
            category="refererApp"
            :filter="resourceFilter"
            :periods="periods"
            :labels="appTitles"
            @update:agg="(agg: any) => fetchAppTitles(agg)"
          />
          <chart-categories
            title="Requêtes / site d'origine"
            category="refererDomain"
            :filter="resourceFilter"
            :periods="periods"
          />
          <chart-categories
            title="Requêtes / catégorie d'utilisateur"
            category="userClass"
            :filter="resourceFilter"
            :periods="periods"
          />
          <chart-categories
            title="Requêtes / consommateurs"
            category="refererCategory"
            :filter="resourceFilter"
            :periods="periods"
            :labels="refererCategoryLabels"
          />
        </template>
        <template v-else>
          <chart-date-histo
            title="Historique ouvertures"
            :filter="{ ...resourceFilter, operationTrack: 'openApplication' }"
            :periods="periods"
          />
          <chart-date-histo
            title="Historique appels API via la visualisation"
            :filter="{ ...viaAppFilter, operationTrack: 'readDataAPI' }"
            :periods="periods"
          />
          <chart-categories
            title="Appels API / jeu de données"
            category="resource"
            :filter="{ ...viaAppFilter, operationTrack: 'readDataAPI' }"
            :periods="periods"
          />
          <chart-categories
            title="Ouvertures / site d'origine"
            category="refererDomain"
            :filter="resourceFilter"
            :periods="periods"
          />
          <chart-categories
            title="Ouvertures / catégorie d'utilisateur"
            category="userClass"
            :filter="resourceFilter"
            :periods="periods"
          />
          <chart-categories
            title="Ouvertures / consommateurs"
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
import { refererCategoryLabels } from '~/utils/labels'

const props = defineProps<{
  resourceType: 'datasets' | 'applications'
  resourceId: string
}>()

const session = useSession()

const periods = ref<any>(null)

// like the traceability of events: a super admin in admin mode sees the audience of a resource of any
// account without switching to it, the metrics are filtered by resource instead of by active account
const ownerFilter = computed((): Record<string, string> => session.user.value?.adminMode ? { showAll: 'true' } : {})

const resourceFilter = computed(() => ({
  ...ownerFilter.value,
  statusClass: 'ok',
  resourceType: props.resourceType,
  resourceId: props.resourceId
}))

// the requests sent from the pages of an application, to the datasets it shows
const viaAppFilter = computed(() => ({
  ...ownerFilter.value,
  statusClass: 'ok',
  refererApp: props.resourceId
}))

type MetricDef = { title: string, filter: Record<string, any>, metric: 'nbRequests' | 'bytes' }
type Metric = { loading?: boolean, value?: string, title?: string, subtitle?: string, trend?: string }

const metricDefs = computed<MetricDef[]>(() => {
  if (props.resourceType === 'datasets') {
    return [
      { title: 'fichiers téléchargés', filter: { ...resourceFilter.value, operationTrack: 'readDataFiles' }, metric: 'nbRequests' },
      { title: 'volume téléchargé', filter: { ...resourceFilter.value, operationTrack: 'readDataFiles' }, metric: 'bytes' },
      { title: "appels d'API", filter: { ...resourceFilter.value, operationTrack: 'readDataAPI' }, metric: 'nbRequests' }
    ]
  }
  return [
    { title: 'ouvertures', filter: { ...resourceFilter.value, operationTrack: 'openApplication' }, metric: 'nbRequests' },
    { title: "appels d'API via la visualisation", filter: { ...viaAppFilter.value, operationTrack: 'readDataAPI' }, metric: 'nbRequests' },
    { title: 'volume de données chargé', filter: viaAppFilter.value, metric: 'bytes' }
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
    const format = (value: number) => def.metric === 'bytes' ? formatBytes(value) : value.toLocaleString()
    return {
      value: format(current),
      title: def.title,
      subtitle: `${format(previous)} sur période précédente`,
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
    query: { split: 'resource', ...ownerFilter.value, resourceType: 'applications', resourceId: ids, start: periods.value.previous.start, end: periods.value.current.end }
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
