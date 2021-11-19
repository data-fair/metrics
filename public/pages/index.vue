<template>
  <v-container
    v-if="initialized && user"
    fluid
    class="home my-0"
  >
    <daily-api-metrics />
  </v-container>
</template>

<i18n lang="yaml">
</i18n>

<script>
const { mapState, mapActions, mapGetters } = require('vuex')

export default {
  components: {},
  data: () => ({}),
  computed: {
    ...mapState('session', ['user', 'initialized']),
    ...mapGetters('session', ['activeAccount'])
  },
  methods: {
    ...mapActions('session', ['login'])
  }
}
</script>
