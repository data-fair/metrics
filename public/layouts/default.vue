<template>
  <v-app
    :dark="$vuetify.theme.dark"
    class="data-fair"
  >
    <template v-if="isMainDomain">
      <layout-navigation-top :nav-context="navContext" />
      <v-main>
        <nuxt />
        <layout-notifications />
      </v-main>
    </template>
    <v-container v-else>
      <v-alert
        v-t="'wrongDomain'"
        type="error"
      />
    </v-container>
  </v-app>
</template>

<script>
const { mapState } = require('vuex')

export default {
  data: () => ({
    navContext: {
      drawer: false
    }
  }),
  computed: {
    ...mapState(['env']),
    isMainDomain () {
      return this.env.mainPublicUrl.startsWith(window.location.origin)
    }
  },
  mounted () {
    if (!this.$vuetify.breakpoint.mobile) this.navContext.drawer = true
  }
}

</script>

<i18n lang="yaml">
fr:
  wrongDomain: Cette page n'est pas consultable depuis ce domaine.
en:
  wrongDomain: This page cannot be accessed from this domain.
</i18n>
