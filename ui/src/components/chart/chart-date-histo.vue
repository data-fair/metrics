<template>
  <layout-resizable-card
    :title="title"
    :aspect-ratio="aspectRatio"
    :loading="loading"
  >
    <canvas :id="canvasId" />
  </layout-resizable-card>
</template>

<script setup lang="ts">
import formatBytes from '@data-fair/lib-vue/format/bytes.js'
import { useDisplay, useTheme } from 'vuetify'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  title: string
  filter: Record<string, any>
  periods: Record<string, any>
}>()

const { dayjs } = useLocaleDayjs()
const display = useDisplay()
const theme = useTheme()
const { t, locale } = useI18n()

const aggResult = ref<any>(null)
const loading = ref(false)
let chartInstance: InstanceType<typeof chart.Chart> | null = null

const canvasId = computed(() => {
  return `chart-date-histo-${JSON.stringify(props.filter).replace(/[{}"]/g, '').replace(/[,:]/g, '-')}`
})

const aspectRatio = computed(() => display.smAndDown.value ? 1 : 2)

const chartConfig = computed(() => {
  if (!aggResult.value) return null
  const days = aggResult.value.days.map((day: string) => {
    const serieItem = aggResult.value.series[0]?.days[day]
    return {
      label: dayjs(day).format('L'),
      value: serieItem ? serieItem.nbRequests : 0,
      tooltip: serieItem
        ? t('requestsTooltip', { nb: serieItem.nbRequests.toLocaleString(locale.value), bytes: formatBytes(serieItem.bytes, locale.value) }, serieItem.nbRequests)
        : t('noRequest')
    }
  })
  return {
    type: 'bar' as const,
    data: {
      labels: days.map((c: any) => c.label),
      datasets: [{
        label: t('currentPeriod'),
        data: days.map((c: any) => c.value),
        backgroundColor: String(theme.current.value.colors.accent),
        borderRadius: 4
      }]
    },
    options: {
      locale: locale.value,
      scales: {},
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (tooltipItem: any) => {
              return days[tooltipItem.dataIndex].tooltip
            }
          }
        }
      }
    }
  }
})

const fetchData = async () => {
  loading.value = true
  aggResult.value = await $fetch('daily-api-metrics/_agg', {
    query: { split: 'day', ...props.filter, start: props.periods.current.start, end: props.periods.current.end }
  })
  loading.value = false
}

const updateChart = async () => {
  await fetchData()
  if (chartInstance && chartConfig.value) {
    chartInstance.options = chartConfig.value.options as any
    chartInstance.data = chartConfig.value.data
    chartInstance.update()
  }
}

watch(() => props.periods, () => updateChart())
watch(() => props.filter, (oldValue, newValue) => {
  if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return
  updateChart()
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

<i18n lang="yaml">
en:
  currentPeriod: Current period
  noRequest: 0 requests
  requestsTooltip: "{nb} requests totalling {bytes} | {nb} request totalling {bytes} | {nb} requests totalling {bytes}"
fr:
  currentPeriod: Période en cours
  noRequest: 0 requête
  requestsTooltip: "{nb} requête cumulant {bytes} | {nb} requête cumulant {bytes} | {nb} requêtes cumulant {bytes}"
</i18n>
