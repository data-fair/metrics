<template>
  <v-app-bar
    app
    flat
    dense
    clipped-left
    class="px-0 main-app-bar"
  >
    <v-list
      class="py-0"
      color="transparent"
    >
      <layout-brand-title />
    </v-list>
    <v-spacer />
    <v-toolbar-items>
      <notifications-queue
        v-if="user && env.notifyUrl"
        :notify-url="env.notifyUrl"
      />
      <personal-menu />
      <lang-switcher />
    </v-toolbar-items>
  </v-app-bar>
</template>

<i18n lang="yaml">
fr:
  login: Se connecter / S'inscrire
  logout: Se déconnecter
  personalAccount: Compte personnel
  switchAccount: Changer de compte
en:
  login: Login / Sign up
  logout: Logout
  personalAccount: Personal account
  switchAccount: Switch account
</i18n>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
import PersonalMenu from '@data-fair/sd-vue/src/vuetify/personal-menu.vue'
import LangSwitcher from '@data-fair/sd-vue/src/vuetify/lang-switcher.vue'

export default {
  components: { PersonalMenu, LangSwitcher },
  props: { navContext: { type: Object, required: true } },
  computed: {
    ...mapState(['env', 'breadcrumbItems', 'breadcrumbsRouteName']),
    ...mapState('session', ['user', 'initialized']),
    ...mapGetters(['canAdmin', 'canContrib', 'missingSubscription']),
    ...mapGetters('session', ['activeAccount'])
  },
  methods: {
    ...mapActions('session', ['logout', 'login', 'switchOrganization']),
    reload () {
      window.location.reload()
    },
    setDarkCookie (value) {
      const maxAge = 60 * 60 * 24 * 100 // 100 days
      this.$cookies.set('theme_dark', '' + value, { path: '/', domain: this.env.sessionDomain, maxAge })
      this.reload()
    },
    setAdminMode (value) {
      const redirect = value ? null : this.env.publicUrl
      this.$store.dispatch('session/setAdminMode', { value, redirect })
    }
  }
}
</script>

<style lang="css">
.main-app-bar .v-toolbar__content {
  padding-left: 0;
  padding-right: 0;
}
</style>
