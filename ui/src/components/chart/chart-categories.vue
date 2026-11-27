<template>
  <layout-resizable-card
    v-model="large"
    :title="title"
    :aspect-ratio="aspectRatio"
    :loading="loading"
  >
    <canvas ref="canvas" />
  </layout-resizable-card>
</template>

<script setup lang="ts">
import formatBytes from '@data-fair/lib-vue/format/bytes.js'
import { useDisplay, useTheme } from 'vuetify'
import { useI18n } from 'vue-i18n'
import { ownerKey } from '~/utils/owners'

const props = withDefaults(defineProps<{
  title: string
  category?: string
  filter: Record<string, any>
  periods: Record<string, any>
  labels?: Record<string, string> | null
  // the value drawn by the bars, the other one stays in the tooltips
  metric?: 'nbRequests' | 'bytes'
}>(), {
  category: 'resource',
  labels: null,
  metric: 'nbRequests'
})

const emit = defineEmits<{
  'update:agg': [value: any]
}>()

const uiNotif = useUiNotif()
const display = useDisplay()
const theme = useTheme()
const { t, te, locale } = useI18n()

// the referer applications are only known by their ids, their titles come from their own metrics
const appTitles = ref<Record<string, string>>({})
const fetchAppTitles = async (series: any[]) => {
  const ids = [...new Set(series.map(serie => serie.key.refererApp))].filter(id => id && !(id in appTitles.value))
  if (!ids.length) return
  const result: any = await $fetch('daily-api-metrics/_agg', {
    // the super admin view lists the applications of other accounts
    query: { split: 'resource', resourceType: 'applications', resourceId: ids, showAll: props.filter.showAll, owner: props.filter.owner, start: props.periods.previous.start, end: props.periods.current.end }
  })
  const titles: Record<string, string> = {}
  for (const serie of result.series) titles[serie.key.resource.id] = safeDecodeUriComponent(serie.key.resource.title)
  appTitles.value = { ...appTitles.value, ...titles }
}

const getLabel = (serie: any, category: string, labels: Record<string, string> | null) => {
  if (serie.label) return serie.label
  if (category === 'resource') return safeDecodeUriComponent(serie.key.resource.title)
  if (category === 'owner') return labels?.[ownerKey(serie.key.owner)] ?? serie.key.owner.id
  const value = serie.key[category]
  if (value === 'none') return t('unknown')
  if (value === null || value === undefined) return t('none')
  if ((category === 'userClass' || category === 'refererCategory') && te(`${category}.${value}`)) return t(`${category}.${value}`)
  if (category === 'refererApp' && appTitles.value[value]) return appTitles.value[value]
  if (labels?.[value]) return labels[value]
  return value
}

const aggResult = ref<any>(null)
const loading = ref(false)
const large = ref(false)
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
let chartInstance: InstanceType<typeof chart.Chart> | null = null

const aspectRatio = computed(() => display.smAndDown.value ? 1 : 2)

const chartConfig = computed(() => {
  if (!aggResult.value) return null

  // the api ranks the series by number of requests, a volume chart keeps the biggest volumes
  const series = props.metric === 'bytes'
    ? [...aggResult.value.series].sort((s1: any, s2: any) => s2.bytes - s1.bytes)
    : [...aggResult.value.series]
  const limitedSeries = series.splice(0, large.value ? 19 : 9)
  if (series.length) {
    limitedSeries.push({
      key: 'others',
      label: t('others', { nb: series.length.toLocaleString(locale.value) }, series.length),
      nbRequests: series.reduce((nbRequests: number, s: any) => nbRequests + s.nbRequests, 0),
      bytes: series.reduce((bytes: number, s: any) => bytes + s.bytes, 0),
      previousNbRequests: series.reduce((previousNbRequests: number, s: any) => previousNbRequests + s.previousNbRequests, 0),
      previousBytes: series.reduce((previousBytes: number, s: any) => previousBytes + s.previousBytes, 0)
    })
  }

  const categories = limitedSeries
    .map((s: any) => ({
      label: getLabel(s, props.category, props.labels),
      value: props.metric === 'bytes' ? s.bytes : s.nbRequests,
      previousValue: props.metric === 'bytes' ? s.previousBytes : s.previousNbRequests,
      tooltip: t('requestsTooltip', { nb: s.nbRequests.toLocaleString(locale.value), bytes: formatBytes(s.bytes, locale.value) }, s.nbRequests),
      previousTooltip: t('previousRequestsTooltip', { nb: s.previousNbRequests.toLocaleString(locale.value), bytes: formatBytes(s.previousBytes, locale.value) }, s.previousNbRequests)
    }))

  return {
    type: 'bar' as const,
    data: {
      labels: categories.map((c: any) => c.label),
      datasets: [{
        label: t('currentPeriod'),
        data: categories.map((c: any) => c.value),
        backgroundColor: String(theme.current.value.colors.accent),
        borderRadius: 4
      }, {
        label: t('previousPeriod'),
        data: categories.map((c: any) => c.previousValue),
        backgroundColor: '#9E9E9E',
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y' as const,
      locale: locale.value,
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            precision: 0,
            callback (value: any) {
              return props.metric === 'bytes' ? formatBytes(value, locale.value) : Number(value).toLocaleString(locale.value)
            }
          }
        },
        y: {
          ticks: {
            precision: 0,
            callback (_value: any, index: number) {
              const label = categories[index].label ?? ''
              const front = display.mdAndUp.value ? 20 : 10
              return label.length > front + 10 ? label.slice(0, front) + '...' + label.slice(-10) : label
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (tooltipItem: any) => {
              return tooltipItem.datasetIndex === 1 ? categories[tooltipItem.dataIndex].previousTooltip : categories[tooltipItem.dataIndex].tooltip
            }
          }
        }
      }
    }
  }
})

const fetchPeriod = async (period: { start: string, end: string }) => {
  try {
    return await $fetch('daily-api-metrics/_agg', {
      query: {
        split: props.category,
        ...props.filter,
        start: period.start,
        end: period.end
      }
    })
  } catch (error: any) {
    uiNotif.sendUiNotif({ msg: t('fetchError'), error })
  }
}

const serieKey = (serie: any) => {
  if (props.category === 'resource') return serie.key.resource.id
  if (props.category === 'owner') return ownerKey(serie.key.owner)
  return serie.key[props.category]
}

// a response to an older filter or period, slower than the current one, is dropped
let fetchId = 0

const fetchData = async () => {
  const id = ++fetchId
  loading.value = true
  const [aggResultCurrent, aggResultPrevious] = await Promise.all([
    fetchPeriod(props.periods.current),
    fetchPeriod(props.periods.previous)
  ])
  if (id !== fetchId) return
  if (!aggResultCurrent || !aggResultPrevious) {
    loading.value = false
    return
  }
  emit('update:agg', {
    current: JSON.parse(JSON.stringify(aggResultCurrent)),
    previous: JSON.parse(JSON.stringify(aggResultPrevious))
  })
  const previousSeries = new Map(aggResultPrevious.series.map((ps: any) => [serieKey(ps), ps]))
  aggResultCurrent.series.forEach((serie: any) => {
    const matchingPreviousSerie: any = previousSeries.get(serieKey(serie))
    if (!matchingPreviousSerie) {
      serie.previousNbRequests = 0
      serie.previousBytes = 0
    } else {
      serie.previousNbRequests = matchingPreviousSerie.nbRequests
      serie.previousBytes = matchingPreviousSerie.bytes
    }
  })
  aggResult.value = aggResultCurrent
  loading.value = false
  if (props.category === 'refererApp') fetchAppTitles([...aggResultCurrent.series, ...aggResultPrevious.series]).catch(() => {})
}

watch(chartConfig, () => {
  if (chartInstance && chartConfig.value) {
    chartInstance.options = chartConfig.value.options as any
    chartInstance.data = chartConfig.value.data
    chartInstance.update()
  }
})

watch(() => props.periods, () => fetchData())
watch(() => props.filter, (oldValue, newValue) => {
  if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return
  fetchData()
})

onMounted(async () => {
  await fetchData()
  if (chartInstance) chartInstance.destroy()
  if (canvas.value && chartConfig.value) {
    chartInstance = new chart.Chart(canvas.value, chartConfig.value as any)
  }
})

onUnmounted(() => {
  if (chartInstance) chartInstance.destroy()
})
</script>

<style scoped>
</style>

<i18n lang="yaml">
en:
  currentPeriod: Current period
  previousPeriod: Previous period
  unknown: Unknown
  none: None
  others: "{nb} others | {nb} other | {nb} others"
  requestsTooltip: "{nb} requests totalling {bytes} | {nb} request totalling {bytes} | {nb} requests totalling {bytes}"
  previousRequestsTooltip: "{nb} requests totalling {bytes} over the previous period | {nb} request totalling {bytes} over the previous period | {nb} requests totalling {bytes} over the previous period"
  fetchError: Error while fetching the metrics
  userClass:
    anonymous: Anonymous
    owner: Owner
    external: External user
    ownerAPIKey: Owner (API key)
    externalAPIKey: External user (API key)
  refererCategory:
    backoffice: Back-office
    embed: Embedded views
    app: Applications
    mcp: MCP
    other: Other
fr:
  currentPeriod: Période en cours
  previousPeriod: Période précédente
  unknown: Inconnu
  none: Aucune
  others: "{nb} autre | {nb} autre | {nb} autres"
  requestsTooltip: "{nb} requête cumulant {bytes} | {nb} requête cumulant {bytes} | {nb} requêtes cumulant {bytes}"
  previousRequestsTooltip: "{nb} requête cumulant {bytes} sur la période précédente | {nb} requête cumulant {bytes} sur la période précédente | {nb} requêtes cumulant {bytes} sur la période précédente"
  fetchError: Erreur pendant la récupération des métriques
  userClass:
    anonymous: Anonyme
    owner: Propriétaire
    external: Utilisateur externe
    ownerAPIKey: Propriétaire (clé d'API)
    externalAPIKey: Utilisateur externe (clé d'API)
  refererCategory:
    backoffice: Back-office
    embed: Vues embarquées
    app: Applications
    mcp: MCP
    other: Autre
</i18n>
