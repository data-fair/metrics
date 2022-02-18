<template>
  <v-col
    cols="12"
    :md="large ? 12 : 6"
  >
    <v-card flat>
      <v-card-title class="text-overline primary--text text--darken-2 justify-center pa-0">
        {{ title }}
      </v-card-title>
      <v-btn
        icon
        style="position: absolute; right:0; top: 0;"
        @click="large=!large"
      >
        <v-icon>mdi-image-size-select-small</v-icon>
      </v-btn>
      <v-card-text>
        <slot />
      </v-card-text>
    </v-card>
  </v-col>
</template>

<script>
export default {
  props: {
    title: { type: String, required: true }
  },
  data () {
    return { large: false }
  }
}
</script>

<style>

</style>
