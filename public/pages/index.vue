<template>
  <v-container
    v-if="initialized && user"
    class="home my-0"
  >
    <v-app-bar
      dark
      color="primary"
      rounded
      class="mb-4"
    >
      <filter-period @input="v => periods = v" />
    </v-app-bar>
    <template v-if="periods">
      <v-row>
        <v-col
          cols="12"
          md="6"
        >
          <chart-categories
            title="Téléchargement de fichiers par jeu de données"
            category="resource"
            :filter="{statusClass: 'ok', operationTrack: 'readDataFiles'}"
            :periods="periods"
          />
        </v-col>
        <v-col
          cols="12"
          md="6"
        >
          <chart-categories
            title="Appels aux apis par jeu de données"
            category="resource"
            :filter="{statusClass: 'ok', operationTrack: 'readDataAPI'}"
            :periods="periods"
            @input="v => datasetsAggResult = v"
          />
        </v-col>
      </v-row>

      <v-app-bar
        dark
        color="primary"
        rounded
        class="mb-4"
      >
        <v-autocomplete
          v-model="dataset"
          :loading="!datasetsAggResult"
          :items="datasetItems"
          outlined
          hide-details
          dense
          clearable
          label="ciblez un jeu de données"
          style="max-width: 500px;"
        />
      </v-app-bar>

      <v-row>
        <v-col
          cols="12"
          md="6"
        >
          <chart-date-histo
            title="Historique des téléchargements de fichiers"
            :filter="{...baseFilter, operationTrack: 'readDataFiles'}"
            :periods="periods"
          />
        </v-col>
        <v-col
          cols="12"
          md="6"
        >
          <chart-date-histo
            title="Historique des appels aux apis"
            :filter="{...baseFilter, operationTrack: 'readDataAPI'}"
            :periods="periods"
          />
        </v-col>
        <v-col
          cols="12"
          md="6"
        >
          <chart-categories
            title="Appels par site d'origine"
            category="refererDomain"
            :filter="baseFilter"
            :periods="periods"
          />
        </v-col>
        <v-col
          cols="12"
          md="6"
        >
          <chart-categories
            title="Appels par catégorie d'utilisateur"
            category="userClass"
            :filter="baseFilter"
            :periods="periods"
          />
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<i18n lang="yaml">
</i18n>

<script>
const { mapState, mapActions, mapGetters } = require('vuex')

export default {
  components: {},
  data: () => ({
    periods: null,
    datasetsAggResult: null,
    dataset: null
  }),
  computed: {
    ...mapState('session', ['user', 'initialized']),
    ...mapGetters('session', ['activeAccount']),
    datasetItems () {
      if (!this.datasetsAggResult) return []
      return this.datasetsAggResult.series
        .map(s => ({ text: `${decodeURIComponent(s.key.resource.title)} (${s.nbRequests.toLocaleString()})`, value: s.key.resource.id }))
    },
    baseFilter () {
      const filter = { statusClass: 'ok' }
      if (this.dataset) filter.resourceId = this.dataset
      return filter
    }
  },
  methods: {
    ...mapActions('session', ['login'])
  }
}
</script>
