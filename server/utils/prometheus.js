/* eslint-disable no-new */
// code instrumentation to expose metrics for prometheus
// follow this doc for naming conventions https://prometheus.io/docs/practices/naming/
// /metrics serves container/process/pod specific metrics while /global-metrics
// serves metrics for the whole data-fair installation no matter the scaling

const config = require('config')
const express = require('express')
const promClient = require('prom-client')
const eventToPromise = require('event-to-promise')
const asyncWrap = require('./async-wrap')
const dbUtils = require('./db')

const localRegister = new promClient.Registry()
const globalRegister = new promClient.Registry()

// metrics server
const app = express()
const server = require('http').createServer(app)
app.get('/metrics', asyncWrap(async (req, res) => {
  res.set('Content-Type', localRegister.contentType)
  res.send(await localRegister.metrics())
}))
app.get('/global-metrics', asyncWrap(async (req, res) => {
  res.set('Content-Type', globalRegister.contentType)
  res.send(await globalRegister.metrics())
}))

// local metrics incremented throughout the code
exports.internalError = new promClient.Counter({
  name: 'df_internal_error',
  help: 'Errors in some worker process, socket handler, etc.',
  labelNames: ['errorCode'],
  registers: [localRegister]
})
exports.requests = new promClient.Histogram({
  name: 'df_metrics_requests',
  help: 'Number and duration in seconds of HTTP requests',
  buckets: [0.05, 0.5, 2, 10, 60],
  labelNames: ['cacheStatus', 'operationId', 'statusClass'],
  registers: [localRegister]
})
exports.requestsBytes = new promClient.Histogram({
  name: 'df_metrics_requests_bytes',
  help: 'Total descending kilo-bytes of HTTP requests',
  labelNames: ['cacheStatus', 'operationId', 'statusClass'],
  registers: [localRegister]
})

let mongoClient
exports.start = async () => {
  const { db, client } = await dbUtils.connect()
  mongoClient = client

  // global metrics based on db connection

  new promClient.Gauge({
    name: 'df_metrics_daily-api-metrics_total',
    help: 'Total number of daily api metrics',
    registers: [globalRegister],
    async collect () {
      this.set(await db.collection('daily-api-metrics').estimatedDocumentCount())
    }
  })

  server.listen(config.prometheus.port)
  await eventToPromise(server, 'listening')
  console.log('Prometheus metrics server listening on http://localhost:' + config.prometheus.port)
}

exports.stop = async () => {
  server.close()
  await eventToPromise(server, 'close')
  await mongoClient.close()
}
