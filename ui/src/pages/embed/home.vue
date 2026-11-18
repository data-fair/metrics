<template>
  <v-container data-iframe-height>
    <filter-period-bar v-model="periods">
      <v-btn
        :prepend-icon="mdiTableArrowDown"
        :href="exportUrl"
        class="mx-4"
        color="primary"
        variant="elevated"
      >
        {{ t('export') }}
      </v-btn>
    </filter-period-bar>
    <template v-if="periods">
      <v-row density="compact">
        <chart-categories
          :title="t('chartTitles.downloadsByDataset')"
          category="resource"
          :filter="{ statusClass: 'ok', operationTrack: 'readDataFiles' }"
          :periods="periods"
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

      <audience-datasets
        :filter="baseFilter"
        :periods="periods"
      />
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t, te } = useI18n()

const periods = ref<any>(null)
const aggResultDataAPI = ref<any>(null)
const datasets = useStringsArraySearchParam('datasets')
const refererDomains = useStringsArraySearchParam('refererDomains')
const userClasses = useStringsArraySearchParam('userClasses')
const refererDomainAgg = ref<any>(null)
const userClassAgg = ref<any>(null)
const refererDomainLoading = ref(false)
const userClassLoading = ref(false)

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
  chartTitles:
    downloadsByDataset: Downloads / dataset
    apiCallsByDataset: API calls / dataset
    applicationOpenings: Application openings
  userClasses:
    anonymous: Anonymous
    owner: Owner
    external: External user
    ownerAPIKey: Owner (API key)
    externalAPIKey: External user (API key)
fr:
  export: Exporter
  dataset: Jeu de données
  refererDomain: Site d'origine
  userClass: Catégorie d'utilisateur
  unknown: Inconnu
  none: Aucune
  chartTitles:
    downloadsByDataset: Téléchargements / jeu de données
    apiCallsByDataset: Appels API / jeu de données
    applicationOpenings: Ouvertures de visualisations
  userClasses:
    anonymous: Anonyme
    owner: Propriétaire
    external: Utilisateur externe
    ownerAPIKey: Propriétaire (clé d'API)
    externalAPIKey: Utilisateur externe (clé d'API)
</i18n>
