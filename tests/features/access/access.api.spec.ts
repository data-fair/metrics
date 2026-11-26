/**
 * Who reads the audience of an account: it lists the account's resources with their titles, so like
 * data-fair's listing of an organization's resources it is reserved to its admins and contributors.
 */
import { test } from '@playwright/test'
import { strict as assert } from 'node:assert'
import { axios, axiosAuth, clean, dailyApiMetrics } from '../../support/index.ts'
import type { AxiosAuth } from '../../support/index.ts'

const api = '/metrics/api/daily-api-metrics'
const period = { start: '2026-01-01', end: '2026-01-31' }

const metric = (owner: Record<string, string>) => ({
  owner,
  day: '2026-01-01',
  resource: { type: 'datasets', id: 'private-dataset', title: 'A private dataset' },
  operationTrack: 'readDataAPI',
  statusClass: 'ok',
  userClass: 'anonymous',
  refererDomain: 'localhost',
  refererCategory: 'backoffice',
  nbRequests: 10,
  bytes: 1000,
  duration: 1
})

const status = async (ax: AxiosAuth, path: string, params?: Record<string, string>) =>
  (await ax.get(api + path, { params, validateStatus: () => true })).status

test.describe('access to the audience', () => {
  test.beforeAll(async () => {
    await clean()
    await (await dailyApiMetrics()).insertMany([
      metric({ type: 'organization', id: 'test_metrics_orga1', name: 'Orga 1' }),
      metric({ type: 'user', id: 'test_metrics_user1', name: 'User 1' })
    ])
  })
  test.afterAll(clean)

  test('a member with the user role of the organization is refused @smoke', async () => {
    const ax = await axiosAuth({ email: 'test_metrics_user1@test.com', org: 'test_metrics_orga1' })
    assert.equal(await status(ax, ''), 403)
    assert.equal(await status(ax, '/_agg', { ...period, split: 'resource' }), 403)
    assert.equal(await status(ax, '/_export', period), 403)
  })

  test('a member with another role than admin or contrib is refused', async () => {
    const ax = await axiosAuth({ email: 'test_metrics_manager1@test.com', org: 'test_metrics_orga1' })
    assert.equal(await status(ax, '/_agg', { ...period, split: 'resource' }), 403)
  })

  test('an admin of the organization reads it', async () => {
    const ax = await axiosAuth({ email: 'test_metrics_admin1@test.com', org: 'test_metrics_orga1' })
    const res = await ax.get(`${api}/_agg`, { params: { ...period, split: 'resource' } })
    assert.equal(res.data.nbRequests, 10)
  })

  test('an admin of a department reads it', async () => {
    const ax = await axiosAuth({ email: 'test_metrics_admin1@test.com', org: 'test_metrics_orga1', dep: 'dep1' })
    assert.equal(await status(ax, '/_agg', { ...period, split: 'resource' }), 200)
  })

  test('a user reads the audience of their personal account', async () => {
    const ax = await axiosAuth('test_metrics_user1@test.com')
    const res = await ax.get(`${api}/_agg`, { params: { ...period, split: 'resource' } })
    assert.equal(res.data.nbRequests, 10)
  })

  test('an anonymous call is refused', async () => {
    assert.equal((await axios().get(`${api}/_agg`, { params: period, validateStatus: () => true })).status, 401)
  })
})
