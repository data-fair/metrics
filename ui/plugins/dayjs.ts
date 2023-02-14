import * as dayjs from 'dayjs'
import 'dayjs/locale/fr'
import 'dayjs/locale/en'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(localizedFormat)
dayjs.extend(relativeTime)

export default defineNuxtPlugin((app) => {
  dayjs.locale(app.$i18n.locale.value)
  return {
    provide: {
      day: dayjs
    }
  }
})
