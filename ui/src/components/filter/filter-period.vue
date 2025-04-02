<template>
  <v-row class="ma-0 mb-2">
    <v-select
      :model-value="selectItems.find(si => !si.value || (si.value.start === startPeriod && si.value.end === endPeriod))"
      :items="selectItems"
      label="période"
      style="max-width: 360px;"
      hide-details
      variant="outlined"
      density="compact"
      class="mr-4 mt-2"
      @update:model-value="setPeriod"
    />
    <filter-date-picker
      v-model="startPeriod"
      label="début"
      @update:model-value="input"
    />
    <filter-date-picker
      v-model="endPeriod"
      label="fin"
      @update:model-value="input"
    />
    <chart-legend />
  </v-row>
</template>

<script lang="ts">
import { useLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'

export default {
  emits: ['update:modelValue'],
  setup () {
    const { dayjs } = useLocaleDayjs()

    const startPeriod = useStringSearchParam('start', { default: dayjs().subtract(6, 'days').format('YYYY-MM-DD') })
    const endPeriod = useStringSearchParam('end', { default: dayjs().format('YYYY-MM-DD') })

    return { dayjs, startPeriod, endPeriod }
  },
  data () {
    const defaultSelectItem = {
      title: '7 derniers jours',
      value: {
        start: this.dayjs().subtract(6, 'days').format('YYYY-MM-DD'),
        end: this.dayjs().format('YYYY-MM-DD')
      }
    }
    const selectItems = [
      defaultSelectItem,
      {
        title: 'dernière semaine (du lundi au dimanche)',
        value: {
          start: this.dayjs().startOf('week').subtract(7, 'days').format('YYYY-MM-DD'),
          end: this.dayjs().startOf('week').subtract(1, 'days').format('YYYY-MM-DD')
        }
      },
      {
        title: '30 derniers jours',
        value: {
          start: this.dayjs().subtract(29, 'days').format('YYYY-MM-DD'),
          end: this.dayjs().format('YYYY-MM-DD')
        }
      },
      {
        title: 'dernier mois écoulé',
        value: {
          start: this.dayjs().startOf('month').subtract(1, 'days').startOf('month').format('YYYY-MM-DD'),
          end: this.dayjs().startOf('month').subtract(1, 'days').format('YYYY-MM-DD')
        }
      },
      {
        title: '360 derniers jours',
        value: {
          start: this.dayjs().subtract(359, 'days').format('YYYY-MM-DD'),
          end: this.dayjs().format('YYYY-MM-DD')
        }
      },
      {
        title: 'période personnalisée',
        value: null
      }
    ]
    return {
      selectItems
    }
  },
  mounted () {
    this.input()
  },
  methods: {
    setPeriod (value: any) {
      if (value) {
        this.startPeriod = value.start
        this.endPeriod = value.end
        this.input()
      }
    },
    input () {
      const duration = this.dayjs(this.endPeriod).diff(this.startPeriod, 'day')
      this.$emit('update:modelValue', {
        previous: {
          start: this.dayjs(this.startPeriod).subtract(duration + 1, 'days').format('YYYY-MM-DD'),
          end: this.dayjs(this.startPeriod).subtract(1, 'days').format('YYYY-MM-DD')
        },
        current: {
          start: this.startPeriod,
          end: this.endPeriod
        }
      })
    }
  }
}
</script>

<style>

</style>
