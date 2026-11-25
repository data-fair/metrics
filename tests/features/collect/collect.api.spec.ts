import { test } from '@playwright/test'
import { strict as assert } from 'node:assert'
import { axiosAuth, clean, dailyApiMetrics } from '../../support/index.ts'
import type { AxiosAuth } from '../../support/index.ts'

// the daemon writes its bulk at most 1 s after a log line (daemon/config/development.mjs maxDelayMS)
const waitForMetric = async (datasetId: string) => {
  for (let i = 0; i < 50; i++) {
    const doc = await (await dailyApiMetrics()).findOne({ 'resource.id': datasetId })
    if (doc) return doc
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error('no metric written within 10s: is the daemon running? Read its logs (dev/logs/daemon.log by default)')
}

let adminAx: AxiosAuth

// every dataset adds collections and indexes to the mongo of the dev env, whose open files are limited
const datasetIds: string[] = []
const createDataset = async (title: string) => {
  const dataset = (await adminAx.post('/data-fair/api/v1/datasets', { isRest: true, title, schema: [{ key: 'prop1', type: 'string' }] })).data
  datasetIds.push(dataset.id)
  return dataset
}
const deleteDatasets = async () => {
  for (const id of datasetIds.splice(0)) await adminAx.delete(`/data-fair/api/v1/datasets/${id}`)
}

// after a restart of the daemon, nginx still writes to the previous socket: its first log line is
// lost, then it reconnects. Send requests until one reaches the database, so the tests start on a
// working pipeline.
const primeLogPipeline = async () => {
  const dataset = await createDataset('prime')
  for (let i = 0; i < 10; i++) {
    await adminAx.get(`/data-fair/api/v1/datasets/${dataset.id}/lines`)
    for (let j = 0; j < 10; j++) {
      if (await (await dailyApiMetrics()).findOne({ 'resource.id': dataset.id })) return
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }
  throw new Error('no metric written after 10 requests: is the daemon running? Read its logs (dev/logs/daemon.log by default)')
}

test.describe('daily api metrics', () => {
  // logged in once per worker, after the state setup checked the dev env
  test.beforeAll(async () => {
    adminAx = await axiosAuth({ email: 'test_metrics_superadmin@test.com', adminMode: true })
    await primeLogPipeline()
  })
  test.afterAll(deleteDatasets)

  test.beforeEach(clean)

  test('daily metrics should be collected by daemon @smoke', async () => {
    const dataset = await createDataset('d1')
    await adminAx.get(`/data-fair/api/v1/datasets/${dataset.id}/lines`)
    const doc = await waitForMetric(dataset.id)
    assert.equal(doc.day.length, 10)
    assert.equal(doc.owner.type, 'user')
    assert.equal(doc.owner.id, 'test_metrics_superadmin')
    assert.equal(doc.operationTrack, 'readDataAPI')
    assert.equal(doc.statusClass, 'ok')
    assert.equal(doc.nbRequests, 1)
  })

  // the classification itself is unit tested (collect.unit.spec.ts), this checks that nginx passes the referer
  test('the referer reaches the daemon', async () => {
    const dataset = await createDataset('d1')
    await adminAx.get(`/data-fair/api/v1/datasets/${dataset.id}/lines`, { headers: { Referer: `http://${process.env.DEV_HOST}/data-fair/embed/dataset/${dataset.id}?referer=a.fr` } })
    const doc = await waitForMetric(dataset.id)
    assert.equal(doc.refererCategory, 'embed')
    assert.equal(doc.refererDomain, 'a.fr')
  })
})
