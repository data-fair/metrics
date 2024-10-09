<template>
  <v-container
    class="home my-0"
    :fluid="$vuetify.display.lgAndDown"
    data-iframe-size
  >
    <v-toolbar
      variant="tonal"
      rounded
      :class="`mb-4 section-bar-${$vuetify.theme.current.dark ? 'dark' : 'light'}`"
    >
      <v-icon
        size="x-large"
        color="primary"
        class="mx-4"
        :icon="mdiCalendarRange"
      />
      <filter-period @update:model-value="(v: any) => periods = v" />
    </v-toolbar>
    <tutorial-alert id="metrics-gzip">
      À partir de la 2e moitié de janvier 2024 la manière de compter les volumes de données téléchargés a changé.
      Auparavant, le volume était comptabilisé après la compression Gzip effectuée par le serveur web, maintenant c'est le volume brut qui est compté sans tenir compte de la compression.
      Cela peut avoir pour effet une augmentation soudaine des valeurs (jusqu'à x2 ou x3 en fonction de la nature des données).
    </tutorial-alert>
    <template v-if="periods">
      <v-row dense>
        <chart-categories
          title="Téléchargements / jeu de données"
          category="resource"
          :filter="{ statusClass: 'ok', operationTrack: 'readDataFiles' }"
          :periods="periods"
          @update:agg="(v: any) => aggResultDataFiles = v"
        />
        <chart-categories
          title="Appels API / jeu de données"
          category="resource"
          :filter="{ statusClass: 'ok', operationTrack: 'readDataAPI' }"
          :periods="periods"
          @update:agg="(v: any) => aggResultDataAPI = v"
        />
        <chart-categories
          title="Ouvertures de visualisations"
          category="resource"
          :filter="{ statusClass: 'ok', operationTrack: 'openApplication' }"
          :periods="periods"
          @update:agg="(v: any) => aggResultOpenApp = v"
        />
      </v-row>

      <v-toolbar
        variant="tonal"
        rounded
        :class="`my-4 section-bar-${$vuetify.theme.current.dark ? 'dark' : 'light'}`"
      >
        <v-icon
          size="x-large"
          color="primary"
          class="mx-4"
          :icon="mdiDatabase"
        />
        <v-autocomplete
          v-model="dataset"
          :loading="!aggResultDataAPI"
          :items="datasetItems"
          hide-details
          variant="outlined"
          density="compact"
          clearable
          label="ciblez un jeu de données"
          style="max-width: 500px;"
        />
      </v-toolbar>

      <v-row>
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
          />
        </v-col>
      </v-row>

      <v-row dense>
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
          title="Requêtes / traitement"
          category="processing"
          :filter="baseFilter"
          :periods="periods"
        />
      </v-row>
    </template>
  </v-container>
</template>

<i18n lang="yaml">
</i18n>

<script lang="ts">
import formatBytes from '@data-fair/lib-vue/format/bytes.js'
import tutorialAlert from '@data-fair/lib-vuetify/tutorial-alert.vue'

export default {
  components: {
    tutorialAlert,
    chartSimpleMetric,
    chartCategories,
    chartDateHisto,
    filterPeriod
  },
  data: () => ({
    periods: null,
    aggResultDataFiles: null as any,
    aggResultDataAPI: null as any,
    aggResultOpenApp: null as any,
    dataset: null,
    mdiCalendarRange,
    mdiDatabase
  }),
  computed: {
    datasetItems () {
      if (!this.aggResultDataAPI) return []
      return this.aggResultDataAPI.current.series
        .map((s: any) => ({ title: safeDecodeUriComponent(s.key.resource.title), value: s.key.resource.id, serie: s }))
    },
    baseFilter () {
      const filter: any = { statusClass: 'ok' }
      if (this.dataset) filter.resourceId = this.dataset
      return filter
    },
    simpleMetricsSeries (): any {
      if (!this.aggResultDataFiles || !this.aggResultDataAPI) return null
      if (!this.dataset) return { dataFiles: this.aggResultDataFiles, dataAPI: this.aggResultDataAPI }
      const dataFiles = {
        previous: this.aggResultDataFiles.previous.series.find((s: any) => s.key.resource.id === this.dataset),
        current: this.aggResultDataFiles.current.series.find((s: any) => s.key.resource.id === this.dataset)
      }
      const dataAPI = {
        previous: this.aggResultDataAPI.previous.series.find((s: any) => s.key.resource.id === this.dataset),
        current: this.aggResultDataAPI.current.series.find((s: any) => s.key.resource.id === this.dataset)
      }
      return { dataFiles, dataAPI }
    },
    simpleMetrics () {
      if (!this.simpleMetricsSeries) return
      const simpleMetrics: any[] = []
      for (const operationType of ['dataFiles', 'dataAPI']) {
        for (const metricType of ['nbRequests', 'bytes']) {
          if (operationType === 'dataAPI' && metricType === 'bytes') continue
          if (operationType in this.simpleMetricsSeries) {
            const current = this.simpleMetricsSeries[operationType].current
            if (!current) continue
            const simpleMetric: any = { loading: false }
            if (metricType === 'nbRequests') simpleMetric.value = current.nbRequests.toLocaleString()
            else simpleMetric.value = formatBytes(current.bytes, this.$i18n.locale)

            if (operationType === 'dataAPI') simpleMetric.title = `appel${current.nbRequests > 1 ? 's' : ''} d'API`
            else simpleMetric.title = 'fichiers téléchargés'

            simpleMetric.subtitle = '0 sur période précédente'
            const previous = this.simpleMetricsSeries[operationType].previous
            if (previous) {
              simpleMetric.subtitle = metricType === 'nbRequests' ? previous.nbRequests.toLocaleString() : formatBytes(previous.bytes, this.$i18n.locale)
              simpleMetric.subtitle += ' sur période précédente'
            }
            simpleMetrics.push(simpleMetric)
          } else {
            simpleMetrics.push({ loading: true })
          }
        }
      }
      return simpleMetrics
    },
    appLabels () {
      if (!this.aggResultOpenApp) return
      const labels: any = {}
      this.aggResultOpenApp.previous.series.filter((item: any) => item.key.resource)
        .forEach((item: any) => {
          labels[item.key.resource.id] = item.key.resource.title
        })
      this.aggResultOpenApp.current.series.filter((item: any) => item.key.resource)
        .forEach((item: any) => {
          labels[item.key.resource.id] = item.key.resource.title
        })
      return labels
    }
  }
}
</script>

<style lang="css">
.section-bar-light{
  background: linear-gradient(90deg, rgba(255,255,255,1) 0%, rgba(245,245,245,1) 30%);
}
</style>
