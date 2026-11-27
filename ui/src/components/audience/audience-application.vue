<template>
  <!-- the audience of one application: its openings, and the API calls its pages send to the datasets it shows -->
  <chart-totals
    :defs="totals"
    :periods="periods"
  />
  <v-row density="compact">
    <chart-date-histo
      :title="t('openingsHistory')"
      :filter="{ ...openingsFilter, operationTrack: 'openApplication' }"
      :periods="periods"
    />
    <chart-date-histo
      :title="t('apiCallsHistory')"
      :filter="{ ...viaAppFilter, operationTrack: 'readDataAPI' }"
      :periods="periods"
    />
    <chart-categories
      :title="t('apiCallsByDataset')"
      category="resource"
      :filter="{ ...viaAppFilter, operationTrack: 'readDataAPI' }"
      :periods="periods"
    />
    <chart-categories
      :title="t('openingsByRefererDomain')"
      category="refererDomain"
      :filter="openingsFilter"
      :periods="periods"
    />
    <chart-categories
      :title="t('openingsByUserClass')"
      category="userClass"
      :filter="openingsFilter"
      :periods="periods"
    />
    <chart-categories
      :title="t('openingsByRefererCategory')"
      category="refererCategory"
      :filter="openingsFilter"
      :periods="periods"
    />
  </v-row>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { TotalDef } from '~/components/chart/chart-totals.vue'

const props = defineProps<{
  applicationId: string
  periods: Record<string, any>
}>()

const { t } = useI18n()

const openingsFilter = computed(() => ({ statusClass: 'ok', resourceType: 'applications', resourceId: props.applicationId }))
// the API calls are recorded on the datasets, the application is only their referer
const viaAppFilter = computed(() => ({ statusClass: 'ok', refererApp: props.applicationId }))

const totals = computed<TotalDef[]>(() => [
  { title: value => t('openings', value), filter: { ...openingsFilter.value, operationTrack: 'openApplication' }, metric: 'nbRequests' },
  { title: value => t('apiCalls', value), filter: { ...viaAppFilter.value, operationTrack: 'readDataAPI' }, metric: 'nbRequests' },
  { title: () => t('loadedVolume'), filter: viaAppFilter.value, metric: 'bytes' }
])
</script>

<i18n lang="yaml">
en:
  openings: openings | opening | openings
  apiCalls: generated API calls | generated API call | generated API calls
  loadedVolume: loaded data volume
  openingsHistory: Openings history
  apiCallsHistory: API calls history
  apiCallsByDataset: API calls / dataset
  openingsByRefererDomain: Openings / origin site
  openingsByUserClass: Openings / user category
  openingsByRefererCategory: Openings / consumers
fr:
  openings: ouverture | ouverture | ouvertures
  apiCalls: appel d'API généré | appel d'API généré | appels d'API générés
  loadedVolume: volume de données chargé
  openingsHistory: Historique ouvertures
  apiCallsHistory: Historique appels API
  apiCallsByDataset: Appels API / jeu de données
  openingsByRefererDomain: Ouvertures / site d'origine
  openingsByUserClass: Ouvertures / catégorie d'utilisateur
  openingsByRefererCategory: Ouvertures / consommateurs
</i18n>
