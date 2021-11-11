<template>
  <v-list-item
    to="/"
  >
    <v-list-item-avatar class="brand-logo">
      <img src="~/assets/logo.png">
    </v-list-item-avatar>
    <v-list-item-title
      v-if="!$vuetify.breakpoint.mobile"
      class="text-h5"
    >
      @data-fair/social
    </v-list-item-title>
  </v-list-item>
</template>

<script>
import { mapState } from 'vuex'
export default {
  computed: {
    ...mapState(['env'])
  }
}
</script>

<style lang="css">
.brand-logo.v-avatar {
  border-radius: 0;
  overflow: visible;
}
.brand-logo.v-avatar img {
  height: auto !important;
}
</style>
