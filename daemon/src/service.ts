import type { LogLine } from './types.ts'
import type { PatchKey } from './operations.ts'

import { Counter, Histogram, Gauge } from 'prom-client'
import { servicePromRegistry } from '@data-fair/lib-node/observer.js'
import log from '@data-fair/lib-node/log.js'
import mongo from '#mongo'
import config from '#config'
import debug from 'debug'
import { lineMetric } from './operations.ts'

const debugPatches = debug('patches')

const requestsHistogram = new Histogram({
  name: 'df_metrics_requests',
  help: 'Number and duration in seconds of HTTP requests',
  buckets: [0.05, 0.5, 2, 10, 60],
  labelNames: ['cacheStatus', 'operationId', 'statusClass', 'host']
})
const requestsBytesCounter = new Counter({
  name: 'df_metrics_requests_bytes',
  help: 'Total descending kilo-bytes of HTTP requests',
  labelNames: ['cacheStatus', 'operationId', 'statusClass', 'host']
})

// global metrics based on db connection
// eslint-disable-next-line no-new
new Gauge({
  name: 'df_metrics_daily_api_metrics_total',
  help: 'Total number of daily api metrics',
  registers: [servicePromRegistry],
  async collect () {
    this.set(await mongo.db.collection('daily-api-metrics').estimatedDocumentCount())
  }
})

type Patch = { patchKey: PatchKey, $set: Record<string, any>, $inc: { nbRequests: number, bytes: number, duration: number } }

// the pending upserts, by the serialized filter: the key of a line metric always lists its fields in the same order
const patches = new Map<string, Patch>()
let timeout: ReturnType<typeof setTimeout> | null = null

const flush = () => {
  const bulk = getBulk()
  if (!bulk) return
  bulk.execute().catch(err => {
    log.error('could not write the daily metrics', { code: 'bulk-write', err })
  })
}

export function pushLogLine (line: LogLine) {
  const metric = lineMetric(line)
  if (!metric) return

  // increment prometheus metrics
  requestsHistogram.labels(line[11], metric.operationId, metric.statusClass, line[0]).observe(metric.duration)
  requestsBytesCounter.labels(line[11], metric.operationId, metric.statusClass, line[0]).inc(metric.bytes)

  const key = JSON.stringify(metric.patchKey)
  const existingPatch = patches.get(key)
  if (existingPatch) {
    existingPatch.$inc.nbRequests += metric.nbRequests
    existingPatch.$inc.bytes += metric.bytes
    existingPatch.$inc.duration += metric.duration
  } else {
    patches.set(key, {
      patchKey: metric.patchKey,
      $set: metric.set(),
      $inc: { nbRequests: metric.nbRequests, bytes: metric.bytes, duration: metric.duration }
    })
  }

  if (patches.size >= config.maxBulkSize) {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
    flush()
  } else if (!timeout) {
    timeout = setTimeout(() => {
      timeout = null
      flush()
    }, config.maxDelayMS)
  }
}

export function getBulk () {
  if (!patches.size) return null
  debugPatches('send bulk patches', patches.size)
  const bulk = mongo.db.collection('daily-api-metrics').initializeUnorderedBulkOp()
  for (const { patchKey, $set, $inc } of patches.values()) {
    bulk.find(patchKey).upsert().updateOne({ $set, $inc })
  }
  patches.clear()
  return bulk
}
