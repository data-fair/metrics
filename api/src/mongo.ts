import type { DailyApiMetric } from '#types'

import mongo from '@data-fair/lib-node/mongo.js'
import config from '#config'

export class MetricsMongo {
  get client () {
    return mongo.client
  }

  get db () {
    return mongo.db
  }

  get dailyApiMetrics () {
    return mongo.db.collection<DailyApiMetric>('daily-api-metrics')
  }

  init = async () => {
    await mongo.connect(config.mongo.url, config.mongo.options)
  }
}

const metricsMongo = new MetricsMongo()

export default metricsMongo
