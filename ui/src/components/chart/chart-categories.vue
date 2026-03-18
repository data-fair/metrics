<template>
  <layout-resizable-card
    v-model="large"
    :title="title"
    :aspect-ratio="aspectRatio"
    :loading="loading"
  >
    <canvas :id="canvasId" />
  </layout-resizable-card>
</template>

<script setup lang="ts">
import truncateMiddle from 'truncate-middle'
import formatBytes from '@data-fair/lib-vue/format/bytes.js'
import { useDisplay, useTheme } from 'vuetify'
import { useI18n } from 'vue-i18n'

const userClasses: Record<string, string> = {
  anonymous: 'Anonyme',
  owner: 'Propriétaire',
  external: 'Utilisateur externe',
  ownerAPIKey: "Propriétaire (clé d'API)",
  externalAPIKey: "Utilisateur externe (clé d'API)",
  ownerProcessing: 'Propriétaire (traitement)',
  externalProcessing: 'Utilisateur externe (traitement)'
}

const getLabel = (serie: any, category: string, labels: Record<string, string> | null) => {
  if (serie.label) return serie.label
  if (category === 'resource') return safeDecodeUriComponent(serie.key.resource.title)
  if (category === 'processing') return safeDecodeUriComponent(serie.key.processing.title)
  if (category === 'userClass') return userClasses[serie.key.userClass] || serie.key.userClass
  if (serie.key[category] === 'none') return 'Inconnu'
  if (serie.key[category] === null || serie.key[category] === undefined) return 'Aucune'
  if (labels && labels[serie.key[category]]) return labels[serie.key[category]]
  return serie.key[category]
}

const props = withDefaults(defineProps<{
  title: string
  category?: string
  filter: Record<string, any>
  periods: Record<string, any>
  labels?: Record<string, string> | null
  lgCols?: number
}>(), {
  category: 'resource',
  labels: null,
  lgCols: 4
})

const emit = defineEmits<{
  'update:agg': [value: any]
}>()

const uiNotif = useUiNotif()
const display = useDisplay()
const theme = useTheme()
const { locale } = useI18n()

const aggResult = ref<any>(null)
const loading = ref(false)
const large = ref(false)
let chartInstance: InstanceType<typeof chart.Chart> | null = null

const canvasId = computed(() => {
  return `chart-categories-${props.category}-${JSON.stringify(props.filter).replace(/[{}"]/g, '').replace(/[,:]/g, '-')}`
})

const aspectRatio = computed(() => display.smAndDown.value ? 1 : 2)

const chartConfig = computed(() => {
  if (!aggResult.value) return null

  const series = [...aggResult.value.series]
  const limitedSeries = series.splice(0, large.value ? 19 : 9)
  if (series.length) {
    limitedSeries.push({
      key: 'others',
      label: `${series.length} autre(s)`,
      nbRequests: series.reduce((nbRequests: number, s: any) => nbRequests + s.nbRequests, 0),
      bytes: series.reduce((bytes: number, s: any) => bytes + s.bytes, 0),
      previousNbRequests: series.reduce((previousNbRequests: number, s: any) => previousNbRequests + s.previousNbRequests, 0),
      previousBytes: series.reduce((previousBytes: number, s: any) => previousBytes + s.previousBytes, 0)
    })
  }

  const categories = limitedSeries
    .map((s: any) => ({
      label: getLabel(s, props.category, props.labels),
      value: s.nbRequests,
      previousValue: s.previousNbRequests,
      tooltip: `${s.nbRequests.toLocaleString()} requête(s) cumulant ${formatBytes(s.bytes, locale.value)}`,
      previousTooltip: `${s.previousNbRequests.toLocaleString()} requête(s) cumulant ${formatBytes(s.previousBytes, locale.value)} sur Période précédente`
    }))

  return {
    type: 'bar' as const,
    data: {
      labels: categories.map((c: any) => c.label),
      datasets: [{
        label: 'Période en cours',
        data: categories.map((c: any) => c.value),
        backgroundColor: String(theme.current.value.colors.accent),
        borderRadius: 4
      }, {
        label: 'Période précédente',
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
            precision: 0
          }
        },
        y: {
          ticks: {
            precision: 0,
            callback (_value: any, index: number) {
              return truncateMiddle(categories[index].label, display.mdAndUp.value ? 20 : 10, 10, '...')
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
    uiNotif.sendUiNotif({ msg: 'Erreur pendant la récupération des métriques', error })
  }
}

const fetchData = async () => {
  loading.value = true
  const [aggResultCurrent, aggResultPrevious] = await Promise.all([
    fetchPeriod(props.periods.current),
    fetchPeriod(props.periods.previous)
  ])
  if (!aggResultCurrent || !aggResultPrevious) {
    loading.value = false
    return
  }
  emit('update:agg', {
    current: JSON.parse(JSON.stringify(aggResultCurrent)),
    previous: JSON.parse(JSON.stringify(aggResultPrevious))
  })
  aggResultCurrent.series.forEach((serie: any) => {
    const matchingPreviousSerie = aggResultPrevious.series.find((ps: any) => {
      if (props.category === 'resource') return ps.key.resource.id === serie.key.resource.id
      else return ps.key[props.category] === serie.key[props.category]
    })
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
  const canvas = document.getElementById(canvasId.value) as HTMLCanvasElement
  if (canvas && chartConfig.value) {
    chartInstance = new chart.Chart(canvas, chartConfig.value as any)
  }
})

onUnmounted(() => {
  if (chartInstance) chartInstance.destroy()
})
</script>

<style scoped>
</style>
