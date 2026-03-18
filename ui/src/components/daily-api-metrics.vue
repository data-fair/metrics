<template>
  <v-container>
    <v-row>
      <v-col>
        <v-select
          v-model="metric"
          :items="metricItems"
          :return-object="false"
          label="Métrique"
        />
      </v-col>
      <v-col>
        <v-select
          v-model="split"
          :items="splitItems"
          :return-object="false"
          label="Groupe par"
        />
      </v-col>
      <v-col>
        <v-select
          v-model="filters.statusClass"
          :items="statusClasses"
          :return-object="false"
          label="Statut de la réponse"
        />
      </v-col>
      <v-col>
        <v-select
          v-model="filters.userClass"
          :items="userClasses"
          :return-object="false"
          label="Type d'utilisateur"
        />
      </v-col>
    </v-row>
    <div
      class="chart-container"
      data-iframe-height
    >
      <canvas id="chart" />
    </div>
  </v-container>
</template>

<script setup lang="ts">
import formatBytes from '@data-fair/lib-vue/format/bytes.js'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'

const { dayjs } = useLocaleDayjs()
const { locale } = useI18n()
const display = useDisplay()

const filters = reactive({ statusClass: 'ok', userClass: null as string | null })
const split = ref('resource')
const metric = ref<'nbRequests' | 'bytes'>('nbRequests')

const data = useFetch('daily-api-metrics/_agg', { query: { split, ...filters } }).data as Ref<any>

let chartInstance: InstanceType<typeof chart.Chart> | null = null

const statusClasses = [
  { value: 'ok', title: 'ok' },
  { value: 'redirect', title: 'redirection (ok mais sans corps de réponse)' },
  { value: 'clientError', title: "erreur de l'appelant" },
  { value: 'serverError', title: 'erreur du serveur' }
]

const userClasses = [
  { value: null, title: 'tous' },
  { value: 'anonymous', title: 'anonyme' },
  { value: 'owner', title: 'Propriétaire' },
  { value: 'external', title: 'utilisateur externe' },
  { value: 'ownerAPIKey', title: "Propriétaire (clé d'API)" },
  { value: 'externalAPIKey', title: "utilisateur externe (clé d'API)" },
  { value: 'ownerProcessing', title: 'Propriétaire (traitement)' },
  { value: 'externalProcessing', title: 'utilisateur externe (traitement)' }
]

const splitItems = [
  { value: 'resource', title: 'Jeu de données' },
  { value: 'refererDomain', title: "Domaine d'origine" },
  { value: 'operationTrack', title: 'Type de requête' }
]

const metricItems = [
  { value: 'nbRequests', title: 'Nombre de requêtes' },
  { value: 'bytes', title: 'Volume de données' }
]

const chartConfig = computed(() => {
  if (!data.value) return null
  return {
    type: 'bar' as const,
    data: {
      labels: data.value.days.map((day: string) => dayjs(day).format('L')),
      datasets: data.value.series
        .map((s: any) => s)
        .sort((s1: any, s2: any) => s1[metric.value] - s2[metric.value])
        .map((serie: any, i: number) => ({
          label: {
            resource: (key: any) => decodeURIComponent(key.resource.title),
            refererDomain: (key: any) => key.refererDomain,
            operationTrack: (key: any) => ({
              readDataAPI: 'API de données',
              readDataFiles: 'Téléchargement de fichiers de données',
              openApplication: "Ouverture d'une visualisation"
            } as Record<string, string>)[key.operationTrack]
          }[split.value as 'resource' | 'refererDomain' | 'operationTrack']?.(serie.key),
          data: data.value.days.map((day: string) => serie.days[day] ? serie.days[day][metric.value] : 0),
          backgroundColor: ['#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02', '#a6761d', '#666666'][i]
        }))
    },
    options: {
      locale: locale.value,
      aspectRatio: display.smAndDown.value ? 1 : 2,
      scales: {
        y: {
          beginAtZero: true,
          stacked: true,
          ticks: metric.value === 'bytes'
            ? {
                callback: (value: number) => formatBytes(value, locale.value)
              }
            : undefined
        },
        x: {
          stacked: true
        }
      },
      plugins: {
        legend: {
          display: true
        }
      }
    }
  }
})

watch(chartConfig, () => {
  if (chartInstance) chartInstance.destroy()
  const canvas = document.getElementById('chart') as HTMLCanvasElement
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
