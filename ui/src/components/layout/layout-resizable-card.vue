<template>
  <v-col
    cols="12"
    :sm="large ? 12 : 4"
  >
    <v-card
      :variant="large ? 'outlined' : 'text'"
      style="position: relative"
      @mouseover="hover = true"
      @mouseleave="hover = false"
    >
      <v-card-title class="text-label-medium font-weight-bold text-primary text-center text-uppercase">
        {{ title }}

        <!-- Expand/Collapse Button -->
        <v-btn
          v-if="$vuetify.display.mdAndUp && (large || hover)"
          variant="flat"
          style="position: absolute; right:0; top: 0;"
          :icon="mdiImageSizeSelectSmall"
          :title="large ? 'Réduire' : 'Agrandir'"
          @click="toggle"
        />
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

<script setup lang="ts">
defineProps<{
  title: string
  aspectRatio?: number
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const large = ref(false)
const hover = ref(false)

const toggle = () => {
  large.value = !large.value
  emit('update:modelValue', large.value)
}
</script>

<style scoped>
</style>
