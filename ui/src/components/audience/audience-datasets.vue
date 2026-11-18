<template>
  <!-- the audience of the datasets matched by the filter: all of the account's on the home page, a single one in its embed page -->
  <chart-totals
    :defs="totals"
    :periods="periods"
  />
  <v-row density="compact">
    <chart-date-histo
      :title="t('downloadsHistory')"
      :filter="{ ...filter, operationTrack: 'readDataFiles' }"
      :periods="periods"
    />
    <chart-date-histo
      :title="t('apiCallsHistory')"
      :filter="{ ...filter, operationTrack: 'readDataAPI' }"
      :periods="periods"
    />
    <chart-categories
      :title="t('requestsByRefererDomain')"
      category="refererDomain"
      :filter="filter"
      :periods="periods"
    />
    <chart-categories
      :title="t('requestsByUserClass')"
      category="userClass"
      :filter="filter"
      :periods="periods"
    />
    <chart-categories
      :title="t('requestsByApplication')"
      category="refererApp"
      :filter="filter"
      :periods="periods"
    />
    <chart-categories
      :title="t('requestsByRefererCategory')"
      category="refererCategory"
      :filter="filter"
      :periods="periods"
    />
  </v-row>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { TotalDef } from '~/components/chart/chart-totals.vue'

const props = defineProps<{
  filter: Record<string, any>
  periods: Record<string, any>
}>()

const { t } = useI18n()

const totals = computed<TotalDef[]>(() => [
  { title: value => t('downloadedFiles', value), filter: { ...props.filter, operationTrack: 'readDataFiles' }, metric: 'nbRequests' },
  { title: () => t('downloadedVolume'), filter: { ...props.filter, operationTrack: 'readDataFiles' }, metric: 'bytes' },
  { title: value => t('apiCalls', value), filter: { ...props.filter, operationTrack: 'readDataAPI' }, metric: 'nbRequests' }
])
</script>

<i18n lang="yaml">
en:
  downloadedFiles: downloaded files | downloaded file | downloaded files
  downloadedVolume: downloaded volume
  apiCalls: API calls | API call | API calls
  downloadsHistory: Downloads history
  apiCallsHistory: API calls history
  requestsByRefererDomain: Requests / origin site
  requestsByUserClass: Requests / user category
  requestsByApplication: Requests / application
  requestsByRefererCategory: Requests / consumers
fr:
  downloadedFiles: fichier téléchargé | fichier téléchargé | fichiers téléchargés
  downloadedVolume: volume téléchargé
  apiCalls: appel d'API | appel d'API | appels d'API
  downloadsHistory: Historique téléchargements
  apiCallsHistory: Historique appels API
  requestsByRefererDomain: Requêtes / site d'origine
  requestsByUserClass: Requêtes / catégorie d'utilisateur
  requestsByApplication: Requêtes / visualisation
  requestsByRefererCategory: Requêtes / consommateurs
</i18n>
