import { test } from '@playwright/test'
import { strict as assert } from 'node:assert'
import { axiosAuth, clean, dailyApiMetrics } from '../../support/index.ts'
import type { AxiosAuth } from '../../support/index.ts'

// the daemon pane writes its bulk at most 1 s after a log line (daemon/config/development.mjs maxDelayMS)
const waitForMetric = async (datasetId: string) => {
  for (let i = 0; i < 50; i++) {
    const doc = await (await dailyApiMetrics()).findOne({ 'resource.id': datasetId })
    if (doc) return doc
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error('no metric written within 10s: is the daemon pane running? "npx --no df-dev logs daemon"')
}

let adminAx: AxiosAuth

test.describe('daily api metrics', () => {
  // logged in once per worker, after the state setup checked the dev env
  test.beforeAll(async () => {
    adminAx = await axiosAuth({ email: 'superadmin@test.com', adminMode: true })
  })

  test.beforeEach(clean)

  test('daily metrics should be collected by daemon @smoke', async () => {
    const dataset = (await adminAx.post('/data-fair/api/v1/datasets', {
      isRest: true,
      title: 'd1',
      schema: [{ key: 'prop1', type: 'string' }]
    })).data
    await adminAx.get(`/data-fair/api/v1/datasets/${dataset.id}/lines`)
    const doc = await waitForMetric(dataset.id)
    assert.equal(doc.day.length, 10)
    assert.equal(doc.owner.type, 'user')
    assert.equal(doc.owner.id, 'superadmin')
    assert.equal(doc.operationTrack, 'readDataAPI')
    assert.equal(doc.statusClass, 'ok')
    assert.equal(doc.nbRequests, 1)
  })

  // the classification itself is unit tested (collect.unit.spec.ts), this checks that nginx passes the referer
  test('the referer reaches the daemon', async () => {
    const dataset = (await adminAx.post('/data-fair/api/v1/datasets', {
      isRest: true,
      title: 'd1',
      schema: [{ key: 'prop1', type: 'string' }]
    })).data
    await adminAx.get(`/data-fair/api/v1/datasets/${dataset.id}/lines`, { headers: { Referer: `http://${process.env.DEV_HOST}/data-fair/embed/dataset/${dataset.id}?referer=a.fr` } })
    const doc = await waitForMetric(dataset.id)
    assert.equal(doc.refererCategory, 'embed')
    assert.equal(doc.refererDomain, 'a.fr')
  })
})
