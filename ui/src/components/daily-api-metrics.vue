<template>
  <v-container>
    <v-row>
      <v-col>
        <v-select
          v-model="metric"
          :items="metricItems"
          :return-object="false"
          :label="t('metric')"
        />
      </v-col>
      <v-col>
        <v-select
          v-model="split"
          :items="splitItems"
          :return-object="false"
          :label="t('groupBy')"
        />
      </v-col>
      <v-col>
        <v-select
          v-model="filters.statusClass"
          :items="statusClasses"
          :return-object="false"
          :label="t('responseStatus')"
        />
      </v-col>
      <v-col>
        <v-select
          v-model="filters.userClass"
          :items="userClasses"
          :return-object="false"
          :label="t('userType')"
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
const { t, locale } = useI18n()
const display = useDisplay()

const filters = reactive({ statusClass: 'ok', userClass: null as string | null })
const split = ref('resource')
const metric = ref<'nbRequests' | 'bytes'>('nbRequests')

const data = useFetch('daily-api-metrics/_agg', { query: { split, ...filters } }).data as Ref<any>

let chartInstance: InstanceType<typeof chart.Chart> | null = null

const statusClasses = computed(() => ['ok', 'redirect', 'clientError', 'serverError']
  .map(value => ({ value, title: t(`statusClasses.${value}`) })))

const userClasses = computed(() => [
  { value: null, title: t('userClasses.all') },
  ...['anonymous', 'owner', 'external', 'ownerAPIKey', 'externalAPIKey']
    .map(value => ({ value, title: t(`userClasses.${value}`) }))
])

const splitItems = computed(() => ['resource', 'refererDomain', 'operationTrack']
  .map(value => ({ value, title: t(`splits.${value}`) })))

const metricItems = computed(() => ['nbRequests', 'bytes']
  .map(value => ({ value, title: t(`metrics.${value}`) })))

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
            operationTrack: (key: any) => t(`operationTracks.${key.operationTrack}`)
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

<i18n lang="yaml">
en:
  metric: Metric
  groupBy: Group by
  responseStatus: Response status
  userType: User type
  statusClasses:
    ok: OK
    redirect: Redirect (OK but without a response body)
    clientError: Caller error
    serverError: Server error
  userClasses:
    all: All
    anonymous: Anonymous
    owner: Owner
    external: External user
    ownerAPIKey: Owner (API key)
    externalAPIKey: External user (API key)
  splits:
    resource: Dataset
    refererDomain: Origin domain
    operationTrack: Request type
  metrics:
    nbRequests: Number of requests
    bytes: Data volume
  operationTracks:
    readDataAPI: Data API
    readDataFiles: Data files download
    openApplication: Application opening
fr:
  metric: Métrique
  groupBy: Grouper par
  responseStatus: Statut de la réponse
  userType: Type d'utilisateur
  statusClasses:
    ok: OK
    redirect: Redirection (OK mais sans corps de réponse)
    clientError: Erreur de l'appelant
    serverError: Erreur du serveur
  userClasses:
    all: Tous
    anonymous: Anonyme
    owner: Propriétaire
    external: Utilisateur externe
    ownerAPIKey: Propriétaire (clé d'API)
    externalAPIKey: Utilisateur externe (clé d'API)
  splits:
    resource: Jeu de données
    refererDomain: Domaine d'origine
    operationTrack: Type de requête
  metrics:
    nbRequests: Nombre de requêtes
    bytes: Volume de données
  operationTracks:
    readDataAPI: API de données
    readDataFiles: Téléchargement de fichiers de données
    openApplication: Ouverture d'une visualisation
</i18n>
