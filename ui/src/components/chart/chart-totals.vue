<template>
  <!-- a row of totals over the current period, compared to the previous one -->
  <v-row density="compact">
    <v-col
      v-for="(total, i) in totals"
      :key="i"
      cols="12"
      sm="4"
    >
      <chart-simple-metric v-bind="total" />
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import formatBytes from '@data-fair/lib-vue/format/bytes.js'
import { useI18n } from 'vue-i18n'

export type TotalDef = {
  // receives the current value, for the plural forms
  title: (value: number) => string
  filter: Record<string, any>
  metric: 'nbRequests' | 'bytes'
}

const props = defineProps<{
  defs: TotalDef[]
  periods: Record<string, any>
}>()

const { t, locale } = useI18n()

const results = ref<{ current: any, previous: any }[] | null>(null)

const fetchTotals = (filter: Record<string, any>, period: { start: string, end: string }) => $fetch('daily-api-metrics/_agg', {
  query: { split: '', ...filter, start: period.start, end: period.end }
})

// a response to an older filter or period, slower than the current one, is dropped
let fetchId = 0
watch(() => [props.periods, props.defs.map(def => def.filter)], async () => {
  const id = ++fetchId
  results.value = null
  const { current, previous } = props.periods
  try {
    const fetched = await Promise.all(props.defs.map(async (def) => {
      const [c, p] = await Promise.all([fetchTotals(def.filter, current), fetchTotals(def.filter, previous)])
      return { current: c, previous: p }
    }))
    if (id === fetchId) results.value = fetched
  } catch {
    // the cards stay in their loading state, the charts of the page notify the error
  }
}, { immediate: true, deep: true })

const totals = computed(() => props.defs.map((def, i) => {
  if (!results.value) return { loading: true }
  const current: number = results.value[i].current[def.metric]
  const previous: number = results.value[i].previous[def.metric]
  const format = (value: number) => def.metric === 'bytes' ? formatBytes(value, locale.value) : value.toLocaleString(locale.value)
  return {
    value: format(current),
    title: def.title(current),
    subtitle: t('onPreviousPeriod', { value: format(previous) }),
    trend: current > previous ? 'up' : current < previous ? 'down' : 'neutral'
  }
}))
</script>

<i18n lang="yaml">
en:
  onPreviousPeriod: "{value} over the previous period"
fr:
  onPreviousPeriod: "{value} sur la période précédente"
</i18n>
