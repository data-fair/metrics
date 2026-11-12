import { describe, it, before, after, beforeEach } from 'node:test'
import { strict as assert } from 'node:assert'
import mongo from '@data-fair/lib-node/mongo.js'
import { axiosAuth, clean, connectDevEnv, disconnectDevEnv } from './utils/index.ts'

// the daemon pane writes its bulk at most 1 s after a log line (daemon/config/development.mjs maxDelayMS)
const waitForMetric = async (datasetId: string) => {
  for (let i = 0; i < 50; i++) {
    const doc = await mongo.db.collection('daily-api-metrics').findOne({ 'resource.id': datasetId })
    if (doc) return doc
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error('no metric written within 10s: is the daemon pane running? "npx --no df-dev logs daemon"')
}

const adminAx = await axiosAuth({ email: 'superadmin@test.com', adminMode: true })

describe('daily api metrics', () => {
  before(connectDevEnv)
  after(disconnectDevEnv)

  beforeEach(clean)

  it('daily metrics should be collected by daemon', async () => {
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

  describe('referer category classification', () => {
    const cases: Array<{ referer?: string, expected: string }> = [
      { referer: `http://${process.env.DEV_HOST}/data-fair/dataset/some-dataset`, expected: 'backoffice' },
      { referer: `http://${process.env.DEV_HOST}/data-fair/embed/dataset/some-dataset`, expected: 'embed' },
      { referer: `http://${process.env.DEV_HOST}/data-fair/app/507f1f77bcf86cd799439011/`, expected: 'app' },
      { referer: `http://${process.env.DEV_HOST}/mcp`, expected: 'mcp' },
      { referer: 'http://external-site.com/data-fair/embed/dataset/some-dataset', expected: 'other' },
      { referer: undefined, expected: 'other' }
    ]

    for (const { referer, expected } of cases) {
      it(`classifies referer "${referer ?? 'none'}" as "${expected}"`, async () => {
        const dataset = (await adminAx.post('/data-fair/api/v1/datasets', {
          isRest: true,
          title: 'd1',
          schema: [{ key: 'prop1', type: 'string' }]
        })).data
        await adminAx.get(`/data-fair/api/v1/datasets/${dataset.id}/lines`, referer ? { headers: { Referer: referer } } : {})
        const doc = await waitForMetric(dataset.id)
        assert.equal(doc.refererCategory, expected)
      })
    }
  })
})
