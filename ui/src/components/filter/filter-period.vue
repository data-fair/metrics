<template>
  <v-select
    :model-value="selectItems.find(si => !si.value || (si.value.start === startPeriod && si.value.end === endPeriod))"
    :items="selectItems"
    label="Période"
    variant="outlined"
    density="compact"
    class="mr-4"
    max-width="400"
    hide-details
    @update:model-value="setPeriod"
  />
  <filter-date-picker
    v-model="startPeriod"
    label="Début"
    @update:model-value="emitPeriod"
  />
  <filter-date-picker
    v-model="endPeriod"
    label="Fin"
    @update:model-value="emitPeriod"
  />
  <chart-legend />
</template>

<script setup lang="ts">
const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

const { dayjs } = useLocaleDayjs()

const startPeriod = useStringSearchParam('start', { default: dayjs().subtract(6, 'days').format('YYYY-MM-DD') })
const endPeriod = useStringSearchParam('end', { default: dayjs().format('YYYY-MM-DD') })

const selectItems = computed(() => [
  {
    title: '7 derniers jours',
    value: {
      start: dayjs().subtract(6, 'days').format('YYYY-MM-DD'),
      end: dayjs().format('YYYY-MM-DD')
    }
  },
  {
    title: 'dernière semaine (du lundi au dimanche)',
    value: {
      start: dayjs().startOf('week').subtract(7, 'days').format('YYYY-MM-DD'),
      end: dayjs().startOf('week').subtract(1, 'days').format('YYYY-MM-DD')
    }
  },
  {
    title: '30 derniers jours',
    value: {
      start: dayjs().subtract(29, 'days').format('YYYY-MM-DD'),
      end: dayjs().format('YYYY-MM-DD')
    }
  },
  {
    title: 'dernier mois écoulé',
    value: {
      start: dayjs().startOf('month').subtract(1, 'days').startOf('month').format('YYYY-MM-DD'),
      end: dayjs().startOf('month').subtract(1, 'days').format('YYYY-MM-DD')
    }
  },
  {
    title: '360 derniers jours',
    value: {
      start: dayjs().subtract(359, 'days').format('YYYY-MM-DD'),
      end: dayjs().format('YYYY-MM-DD')
    }
  },
  {
    title: 'Période personnalisée',
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
