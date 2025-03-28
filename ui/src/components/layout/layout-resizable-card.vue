<template>
  <v-col
    cols="12"
    :md="large ? 12 : mdCols"
    :lg="large ? 12 : lgCols"
  >
    <v-card
      :variant="large ? 'outlined' : 'text'"
      style="position: relative"
      @mouseover="hover = true"
      @mouseleave="hover = false"
    >
      <v-card-title class="text-overline font-weight-bold text-primary justify-center text-center">
        {{ title }}
        <v-btn
          v-if="$vuetify.display.mdAndUp && (large || hover)"
          icon
          variant="flat"
          style="position: absolute; right:0; top: 0;"
          :title="large ? 'réduire' : 'agrandir'"
          @click="toggle"
        >
          <v-icon :icon="mdiImageSizeSelectSmall" />
        </v-btn>
      </v-card-title>
      <v-card-text>
        <v-responsive :aspect-ratio="aspectRatio">
          <v-progress-linear
            :indeterminate="loading"
            color="primary"
            bg-opacity="0"
          />

          <slot />
        </v-responsive>
      </v-card-text>
    </v-card>
  </v-col>
</template>

<script lang="ts">

export default {
  props: {
    title: { type: String, required: true },
    mdCols: { type: Number, default: 6 },
    lgCols: { type: Number, default: 4 },
    aspectRatio: { type: Number, default: 1 },
    loading: { type: Boolean, default: false }
  },
  emits: ['update:modelValue'],
  data () {
    return {
      large: false,
      hover: false
    }
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
