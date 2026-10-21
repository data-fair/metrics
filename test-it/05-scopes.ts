/**
 * Scope-restricted sessions: the test non-human identity exchanges an assertion for a session
 * limited to some scopes (cookie and bearer), cf test-it/utils/nhi.ts.
 */
import { describe, it, before, after, beforeEach } from 'node:test'
import { strict as assert } from 'node:assert'
import { decodeJwt, decodeProtectedHeader } from 'jose'
import mongo from '@data-fair/lib-node/mongo.js'
import { axios, clean, startApiServer, stopApiServer } from './utils/index.ts'
import { nhiSession } from './utils/nhi.ts'
import { scopedOperations, exportScopesMessage } from '../api/src/scopes.ts'

const api = '/metrics/api'
const period = { start: '2026-01-01', end: '2026-01-31' }
const totals = { ...period, format: 'rows', split: '' }

const metric = (ownerId: string, day: string, nbRequests: number) => ({
  owner: { type: 'organization', id: ownerId, name: ownerId },
  day,
  resource: { type: 'datasets', id: 'd1', title: 'Dataset d1' },
  operationTrack: 'readDataAPI',
  statusClass: 'ok',
  userClass: 'anonymous',
  refererDomain: 'localhost',
  refererCategory: 'backoffice',
  nbRequests,
  bytes: nbRequests * 100,
  duration: nbRequests * 0.5
})

// the paths of the operation table, with the query each route needs to answer
const operationRequests: Record<keyof typeof scopedOperations, { path: string, params?: Record<string, string> }> = {
  listDailyApiMetrics: { path: '/daily-api-metrics' },
  aggDailyApiMetrics: { path: '/daily-api-metrics/_agg', params: totals },
  exportDailyApiMetrics: { path: '/daily-api-metrics/_export', params: period }
}

const rejectsWith = async (promise: Promise<unknown>, status: number, message?: RegExp | string) => {
  await assert.rejects(promise, (err: any) => {
    assert.equal(err.status, status, err.message)
    if (typeof message === 'string') assert.ok(String(err.data).includes(message), err.data)
    else if (message) assert.match(String(err.data), message)
    return true
  })
}

// the export tests need a data-fair that accepts scoped sessions (DF_IMAGE, cf CONTRIBUTING.md)
const dataFairScopeAware = (await axios().get('/data-fair/api/v1/scopes.json', { validateStatus: () => true })).status === 200
// the lib refuses access tokens without an audience, older simple-directory images issue none (SD_IMAGE)
const bearerSkip = decodeJwt((await nhiSession('metrics:read')).accessToken).aud ? false : 'needs a simple-directory issuing access token audiences (SD_IMAGE)'

describe('scope-restricted sessions', () => {
  before(startApiServer)
  after(stopApiServer)
  beforeEach(async () => {
    await clean()
    await mongo.db.collection('daily-api-metrics').insertMany([
      metric('orga1', '2026-01-01', 10),
      metric('orga1', '2026-01-02', 5),
      metric('orga2', '2026-01-02', 1000)
    ])
  })

  it('the token exchange issues a scoped session', async () => {
    const { accessToken } = await nhiSession('metrics:read')
    assert.equal(decodeJwt(accessToken).scope, 'metrics:read')
    assert.ok(decodeProtectedHeader(accessToken).kid?.startsWith('scoped-'))
  })

  it('metrics accepts a session scoped to metrics:read', async () => {
    const { cookieAx } = await nhiSession('metrics:read')
    assert.equal((await cookieAx.get(`${api}/daily-api-metrics`)).status, 200)
  })

  it('an unscoped session of the identity is accepted', async () => {
    const { cookieAx } = await nhiSession()
    assert.equal((await cookieAx.get(`${api}/daily-api-metrics`)).status, 200)
  })

  it('every operation refuses a scope of another family', async () => {
    const { cookieAx } = await nhiSession('datasets:read')
    for (const [operationId, { path, params }] of Object.entries(operationRequests)) {
      await rejectsWith(cookieAx.get(api + path, { params }), 403, /insufficient scope/)
        .catch(err => { throw new Error(`${operationId}: ${err.message}`) })
    }
  })

  it('metrics:read reaches the list and the aggregation', async () => {
    const { cookieAx } = await nhiSession('metrics:read')
    for (const operationId of ['listDailyApiMetrics', 'aggDailyApiMetrics'] as const) {
      const { path, params } = operationRequests[operationId]
      assert.equal((await cookieAx.get(api + path, { params })).status, 200, operationId)
    }
  })

  it('the umbrella and the global tier scopes are accepted, a prefix is not', async () => {
    for (const scope of ['metrics', 'all:read', 'all:write', 'all:admin']) {
      const { cookieAx } = await nhiSession(scope)
      assert.equal((await cookieAx.get(`${api}/daily-api-metrics/_agg`, { params: totals })).status, 200, scope)
    }
    const { cookieAx } = await nhiSession('metrics:readAdvanced')
    await rejectsWith(cookieAx.get(`${api}/daily-api-metrics/_agg`, { params: totals }), 403, /insufficient scope/)
  })

  it('a scoped session only sees its own account', async () => {
    const scoped = await nhiSession('metrics:read')
    const unscoped = await nhiSession()
    const cookieRes = await scoped.cookieAx.get(`${api}/daily-api-metrics/_agg`, { params: totals })
    assert.equal(cookieRes.data.nbRequests, 15)
    assert.deepEqual(cookieRes.data, (await unscoped.cookieAx.get(`${api}/daily-api-metrics/_agg`, { params: totals })).data)
  })

  it('a scoped bearer token gets the same answer as the cookie session', { skip: bearerSkip }, async () => {
    const { cookieAx, bearerAx } = await nhiSession('metrics:read')
    const cookieRes = await cookieAx.get(`${api}/daily-api-metrics/_agg`, { params: totals })
    assert.deepEqual((await bearerAx.get(`${api}/daily-api-metrics/_agg`, { params: totals })).data, cookieRes.data)
  })

  it('admin routes stay refused to scoped sessions', async () => {
    const { cookieAx } = await nhiSession('all:admin')
    await rejectsWith(cookieAx.get(`${api}/admin/info`), 403, /does not check scopes/)
  })

  it('public routes need no session', async () => {
    const { cookieAx } = await nhiSession('metrics:read')
    assert.equal((await cookieAx.get(`${api}/api-docs.json`)).status, 200)
    assert.equal((await cookieAx.get(`${api}/agents/skills/metrics-review.md`)).status, 200)
  })

  it('routes that need no session ignore a broken credential', async () => {
    const brokenCookie = axios({ headers: { cookie: 'id_token=broken.token.value; id_token_sign=broken' } })
    assert.equal((await brokenCookie.get(`${api}/api-docs.json`)).status, 200)
    assert.equal((await brokenCookie.get(`${api}/agents/skills/metrics-review.md`)).status, 200)
    await rejectsWith(brokenCookie.get(`${api}/daily-api-metrics`), 401)
    const strayBearer = axios({ headers: { authorization: 'Bearer not-a-token' } })
    assert.equal((await strayBearer.get(`${api}/api-docs.json`)).status, 200)
  })

  it('the export explains that data-fair refused a session without its scopes', async () => {
    const { cookieAx } = await nhiSession('metrics:read')
    await rejectsWith(cookieAx.get(`${api}/daily-api-metrics/_export`, { params: period }), 403, exportScopesMessage)
  })

  describe('export with a scope-aware data-fair', { skip: dataFairScopeAware ? bearerSkip : 'needs a scope-aware data-fair (DF_IMAGE)' }, () => {
    const xlsx = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    it('a session with the data-fair scopes exports, over cookie and bearer', async () => {
      const { cookieAx, bearerAx } = await nhiSession('metrics:read datasets:read applications:read')
      assert.equal((await cookieAx.get(`${api}/daily-api-metrics/_export`, { params: period })).headers['content-type'], xlsx)
      assert.equal((await bearerAx.get(`${api}/daily-api-metrics/_export`, { params: period })).headers['content-type'], xlsx)
    })

    it('an unscoped bearer exports', async () => {
      const { bearerAx } = await nhiSession()
      assert.equal((await bearerAx.get(`${api}/daily-api-metrics/_export`, { params: period })).headers['content-type'], xlsx)
    })
  })
})
