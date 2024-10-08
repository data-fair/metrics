<template>
  <v-menu
    v-model="menu"
    :close-on-content-click="false"
    transition="scale-transition"
    min-width="auto"
  >
    <template #activator="{ props }">
      <v-text-field
        :model-value="modelValue && dayjs(modelValue).format('L')"
        :label="label"
        readonly
        v-bind="props"
        style="max-width: 150px;"
        hide-details
        variant="outlined"
        density="compact"
        class="mr-4 mt-2"
      />
    </template>
    <v-date-picker
      :model-value="date.parseISO(modelValue)"
      @update:model-value="(v) => { menu = false; $emit('update:modelValue', date.toISO(v)) }"
    />
  </v-menu>
</template>

<script>
import { useDate } from 'vuetify'

export default {
  props: {
    label: { type: String, required: true },
    modelValue: { type: String, default: null }
  },
  emits: ['update:modelValue'],
  setup () {
    const { dayjs } = useLocaleDayjs()
    const date = useDate()
    return { dayjs, date }
  },
  data () {
    return { menu: false }
  }
}
</script>

<style>

</style>
