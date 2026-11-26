import { test } from '@playwright/test'
import { strict as assert } from 'node:assert'
import { axios, dailyApiMetrics } from '../../support/index.ts'

const ax = axios()

// two nested sub-spaces of this suite's own: the clean of one leaves the other alone
const a = 'test_metrics_a_'
const b = 'test_metrics_b_'

const metric = (ownerId: string, ownerType = 'user') => ({
  owner: { type: ownerType, id: ownerId, name: ownerId },
  day: '2026-01-01',
  resource: { type: 'datasets', id: 'd1', title: 'Dataset d1' },
  operationTrack: 'readDataAPI',
  statusClass: 'ok',
  userClass: 'anonymous',
  refererDomain: 'localhost',
  refererCategory: 'backoffice',
  nbRequests: 1,
  bytes: 100,
  duration: 0.1
})

// a user and an organization per sub-space
const seed = async (p: string) => {
  await (await dailyApiMetrics()).insertMany([metric(`${p}user`), metric(`${p}org`, 'organization')])
}
const remaining = async (p: string) => (await dailyApiMetrics()).countDocuments({ 'owner.id': { $in: [`${p}user`, `${p}org`] } })

test.describe('test-env', () => {
  test('test-env clean refuses a missing or invalid prefix', async () => {
    for (const params of [{}, { prefix: '' }, { prefix: 'test' }, { prefix: 'test_' }, { prefix: 'test_metrics' }, { prefix: 'other_x_' }, { prefix: 'test_.*_' }]) {
      const res = await ax.delete('/metrics/api/test-env', { params, validateStatus: () => true })
      assert.equal(res.status, 400, JSON.stringify(params))
    }
  })

  test('test-env clean removes only the prefix\'s rows', async () => {
    await ax.delete('/metrics/api/test-env', { params: { prefix: a } })
    await ax.delete('/metrics/api/test-env', { params: { prefix: b } })
    await seed(a)
    await seed(b)
    const res = await ax.delete('/metrics/api/test-env', { params: { prefix: a } })
    assert.equal(res.status, 204)
    assert.equal(await remaining(a), 0)
    assert.equal(await remaining(b), 2)
    await ax.delete('/metrics/api/test-env', { params: { prefix: b } })
    assert.equal(await remaining(b), 0)
  })
})
