import { describe, it, before, after, beforeEach } from 'node:test'
import { strict as assert } from 'node:assert'
import * as testSpies from '@data-fair/lib-node/test-spies.js'
import mongo from '@data-fair/lib-node/mongo.js'
import { axiosAuth, clean, startApiServer, stopApiServer, startDaemonServer, stopDaemonServer } from './utils/index.ts'

testSpies.registerModuleHooks()

const adminAx = await axiosAuth({ email: 'superadmin@test.com', adminMode: true })

describe('daily api metrics', () => {
  before(startApiServer)
  after(stopApiServer)

  before(startDaemonServer)
  after(stopDaemonServer)

  beforeEach(clean)

  it('daily metrics should be collected by daemon', async () => {
    const dataset = (await adminAx.post('http://localhost:5600/data-fair/api/v1/datasets', {
      isRest: true,
      title: 'd1',
      schema: [{ key: 'prop1', type: 'string' }]
    })).data
    const [rawLine, [day, parsedLine]] = await Promise.all([
      testSpies.waitFor('rawLine'),
      testSpies.waitFor<[string, string]>('parsedLine'),
      adminAx.get(`/data-fair/api/v1/datasets/${dataset.id}/lines`)
    ])
    assert.ok(rawLine)
    assert.equal(day.length, 10)
    assert.ok(Array.isArray(parsedLine))
    assert.equal(parsedLine[0], 'localhost')
    const bulk1 = await testSpies.waitFor('sentBulkDelay')
    assert.equal(bulk1, 1)
  })

  describe('referer category classification', () => {
    const cases: Array<{ referer?: string, expected: string }> = [
      { referer: 'http://localhost/data-fair/dataset/some-dataset', expected: 'backoffice' },
      { referer: 'http://localhost/data-fair/embed/dataset/some-dataset', expected: 'embed' },
      { referer: 'http://localhost/data-fair/app/507f1f77bcf86cd799439011/', expected: 'app' },
      { referer: 'http://localhost/mcp', expected: 'mcp' },
      { referer: 'http://external-site.com/data-fair/embed/dataset/some-dataset', expected: 'other' },
      { referer: undefined, expected: 'other' }
    ]

    for (const { referer, expected } of cases) {
      it(`classifies referer "${referer ?? 'none'}" as "${expected}"`, async () => {
        const dataset = (await adminAx.post('http://localhost:5600/data-fair/api/v1/datasets', {
          isRest: true,
          title: 'd1',
          schema: [{ key: 'prop1', type: 'string' }]
        })).data
        await Promise.all([
          testSpies.waitFor('sentBulkDelay'),
          adminAx.get(`/data-fair/api/v1/datasets/${dataset.id}/lines`, referer ? { headers: { Referer: referer } } : {})
        ])
        const doc = await mongo.db.collection('daily-api-metrics').findOne({ 'resource.id': dataset.id })
        assert.equal(doc?.refererCategory, expected)
      })
    }
  })
})
