import type { DailyApiMetric } from '../../api/types/index.ts'

import mongo from '@data-fair/lib/node/mongo.js'
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
    await mongo.configure({
      'daily-api-metrics': {
        'main-keys': [
          {
            'owner.type': 1,
            'owner.id': 1,
            'owner.department': 1,
            day: 1,
            'resource.type': 1,
            'resource.id': 1,
            operationTrack: 1,
            statusClass: 1,
            userClass: 1,
            refererDomain: 1,
            refererApp: 1,
            'processing._id': 1
          },
          { unique: true }
        ]
      }
    })
  }
}

const metricsMongo = new MetricsMongo()

export default metricsMongo
