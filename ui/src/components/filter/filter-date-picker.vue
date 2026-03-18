<template>
  <v-date-input
    :model-value="modelValue ? date.parseISO(modelValue) : undefined"
    :label="label"
    prepend-icon=""
    style="max-width: 150px;"
    hide-details
    variant="outlined"
    density="compact"
    class="mr-4"
    @update:model-value="(v: any) => $emit('update:modelValue', date.toISO(v))"
  />
</template>

<script setup lang="ts">
import { VDateInput } from 'vuetify/labs/VDateInput'
import { useDate } from 'vuetify'

defineProps<{
  label: string
  modelValue?: string | null
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const date = useDate()
</script>

<style scoped>
</style>
