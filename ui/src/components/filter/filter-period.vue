<template>
  <v-select
    :model-value="selectItems.find(si => !si.value || (si.value.start === startPeriod && si.value.end === endPeriod))"
    :items="selectItems"
    :label="t('period')"
    variant="outlined"
    density="compact"
    class="mr-4"
    max-width="400"
    hide-details
    @update:model-value="setPeriod"
  />
  <filter-date-picker
    v-model="startPeriod"
    :label="t('start')"
    @update:model-value="emitPeriod"
  />
  <filter-date-picker
    v-model="endPeriod"
    :label="t('end')"
    @update:model-value="emitPeriod"
  />
  <chart-legend />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

const { t } = useI18n()
const { dayjs } = useLocaleDayjs()

const startPeriod = useStringSearchParam('start', { default: dayjs().subtract(6, 'days').format('YYYY-MM-DD') })
const endPeriod = useStringSearchParam('end', { default: dayjs().format('YYYY-MM-DD') })

// monday of the current week whatever the locale (the week of the "en" locale starts on sunday)
const currentMonday = () => dayjs().subtract((dayjs().day() + 6) % 7, 'days')

const selectItems = computed(() => [
  {
    title: t('last7Days'),
    value: {
      start: dayjs().subtract(6, 'days').format('YYYY-MM-DD'),
      end: dayjs().format('YYYY-MM-DD')
    }
  },
  {
    title: t('lastWeek'),
    value: {
      start: currentMonday().subtract(7, 'days').format('YYYY-MM-DD'),
      end: currentMonday().subtract(1, 'days').format('YYYY-MM-DD')
    }
  },
  {
    title: t('last30Days'),
    value: {
      start: dayjs().subtract(29, 'days').format('YYYY-MM-DD'),
      end: dayjs().format('YYYY-MM-DD')
    }
  },
  {
    title: t('lastMonth'),
    value: {
      start: dayjs().startOf('month').subtract(1, 'days').startOf('month').format('YYYY-MM-DD'),
      end: dayjs().startOf('month').subtract(1, 'days').format('YYYY-MM-DD')
    }
  },
  {
    title: t('last360Days'),
    value: {
      start: dayjs().subtract(359, 'days').format('YYYY-MM-DD'),
      end: dayjs().format('YYYY-MM-DD')
    }
  },
  {
    title: t('customPeriod'),
    value: null
  }
])

const setPeriod = (value: any) => {
  if (value) {
    startPeriod.value = value.start
    endPeriod.value = value.end
    emitPeriod()
  }
}

const emitPeriod = () => {
  const duration = dayjs(endPeriod.value).diff(startPeriod.value, 'day')
  emit('update:modelValue', {
    previous: {
      start: dayjs(startPeriod.value).subtract(duration + 1, 'days').format('YYYY-MM-DD'),
      end: dayjs(startPeriod.value).subtract(1, 'days').format('YYYY-MM-DD')
    },
    current: {
      start: startPeriod.value,
      end: endPeriod.value
    }
  })
}

onMounted(() => {
  emitPeriod()
})
</script>

<style scoped>
</style>

<i18n lang="yaml">
en:
  period: Period
  start: Start
  end: End
  last7Days: Last 7 days
  lastWeek: Last week (Monday to Sunday)
  last30Days: Last 30 days
  lastMonth: Last full month
  last360Days: Last 360 days
  customPeriod: Custom period
fr:
  period: Période
  start: Début
  end: Fin
  last7Days: 7 derniers jours
  lastWeek: Dernière semaine (du lundi au dimanche)
  last30Days: 30 derniers jours
  lastMonth: Dernier mois écoulé
  last360Days: 360 derniers jours
  customPeriod: Période personnalisée
</i18n>
