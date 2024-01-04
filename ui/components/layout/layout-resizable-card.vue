<template>
  <v-col
    cols="12"
    :md="large ? 12 : mdCols"
    :lg="large ? 12 : lgCols"
  >
    <v-card variant="text">
      <v-card-title class="text-overline font-weight-bold text-primary justify-center text-center">
        {{ title }}
      </v-card-title>
      <v-btn
        v-if="$vuetify.display.mdAndUp"
        icon
        flat
        style="position: absolute; right:0; top: 0;"
        @click="toggle"
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
    title: { type: String, required: true },
    mdCols: { type: Number, default: 6 },
    lgCols: { type: Number, default: 4 }
  },
  emits: ['update:modelValue'],
  data () {
    return { large: false }
  },
  methods: {
    toggle () {
      this.large = !this.large
      this.$emit('update:modelValue', this.large)
    }
  }
}
</script>

<style>

</style>
