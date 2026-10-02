/**
 * Regression tests of GET /api/daily-api-metrics/_agg on a fixed set of daily metrics, with the
 * query shapes the UI sends (split as a string, array filters as repeated keys). The default
 * "series" format is what the charts and the embed home page read; the "rows" format is what
 * agents read and must stay consistent with it.
 */
import { describe, it, before, after } from 'node:test'
import { strict as assert } from 'node:assert'
import mongo from '@data-fair/lib-node/mongo.js'
import { axiosAuth, clean, startApiServer, stopApiServer } from './utils/index.ts'

const adminAx = await axiosAuth({ email: 'superadmin@test.com', adminMode: true })
const orgAx = await axiosAuth({ email: 'admin1@test.com', org: 'orga1' })
const depAx = await axiosAuth({ email: 'admin1@test.com', org: 'orga1', dep: 'dep1' })

type Fixture = { day: string, resource: [string, string], operationTrack: string, statusClass?: string, userClass: string, refererDomain: string, refererCategory?: string, refererApp?: string, nbRequests: number, duration: number, owner?: Record<string, string> }

const superadmin = { type: 'user', id: 'superadmin', name: 'Super Admin' }

const fixtures: Fixture[] = [
  { day: '2026-03-01', resource: ['datasets', 'd1'], operationTrack: 'readDataAPI', userClass: 'anonymous', refererDomain: 'a.fr', refererCategory: 'embed', nbRequests: 10, duration: 1 },
  { day: '2026-03-01', resource: ['datasets', 'd1'], operationTrack: 'readDataFiles', userClass: 'owner', refererDomain: 'localhost', refererCategory: 'backoffice', nbRequests: 2, duration: 2 },
  { day: '2026-03-02', resource: ['datasets', 'd2'], operationTrack: 'readDataAPI', statusClass: 'clientError', userClass: 'external', refererDomain: 'b.fr', refererCategory: 'other', nbRequests: 4, duration: 0.4 },
  // legacy record, collected before refererCategory existed
  { day: '2026-03-03', resource: ['applications', 'app1'], operationTrack: 'openApplication', userClass: 'anonymous', refererDomain: 'a.fr', nbRequests: 7, duration: 0.7 },
  { day: '2026-03-03', resource: ['datasets', 'd1'], operationTrack: 'readDataAPI', userClass: 'anonymous', refererDomain: 'a.fr', refererCategory: 'app', refererApp: 'carte', nbRequests: 5, duration: 0.5 },
  // outside of the queried period
  { day: '2026-03-05', resource: ['datasets', 'd1'], operationTrack: 'readDataAPI', userClass: 'anonymous', refererDomain: 'a.fr', refererCategory: 'embed', nbRequests: 1000, duration: 1 },
  // other owners
  { day: '2026-03-02', resource: ['datasets', 'd1'], operationTrack: 'readDataAPI', userClass: 'anonymous', refererDomain: 'a.fr', refererCategory: 'embed', nbRequests: 100, duration: 1, owner: { type: 'organization', id: 'orga1', name: 'Orga 1' } },
  { day: '2026-03-02', resource: ['datasets', 'd5'], operationTrack: 'readDataAPI', userClass: 'anonymous', refererDomain: 'a.fr', refererCategory: 'embed', nbRequests: 50, duration: 1, owner: { type: 'organization', id: 'orga1', name: 'Orga 1', department: 'dep1' } },
  { day: '2026-03-02', resource: ['datasets', 'd6'], operationTrack: 'readDataAPI', userClass: 'anonymous', refererDomain: 'a.fr', refererCategory: 'embed', nbRequests: 20, duration: 1, owner: { type: 'organization', id: 'orga1', name: 'Orga 1', department: 'dep2' } },
  { day: '2026-03-02', resource: ['datasets', 'd9'], operationTrack: 'readDataAPI', userClass: 'anonymous', refererDomain: 'a.fr', refererCategory: 'embed', nbRequests: 10000, duration: 1, owner: { type: 'user', id: 'other', name: 'Other' } }
]

const toDoc = (f: Fixture) => {
  const doc: Record<string, unknown> = {
    owner: f.owner ?? superadmin,
    day: f.day,
    resource: { type: f.resource[0], id: f.resource[1], title: `Title ${f.resource[1]}` },
    operationTrack: f.operationTrack,
    statusClass: f.statusClass ?? 'ok',
    userClass: f.userClass,
    refererDomain: f.refererDomain,
    nbRequests: f.nbRequests,
    bytes: f.nbRequests * 100,
    duration: f.duration
  }
  if (f.refererCategory) doc.refererCategory = f.refererCategory
  if (f.refererApp) doc.refererApp = f.refererApp
  return doc
}

// the UI's fetch sends arrays as repeated keys, axios would send resourceId[]=...
const agg = async (query: Record<string, string | string[]>, ax = adminAx) => {
  const params = new URLSearchParams({ start: '2026-03-01', end: '2026-03-03' })
  for (const [key, value] of Object.entries(query)) {
    params.delete(key)
    for (const v of Array.isArray(value) ? value : [value]) params.append(key, v)
  }
  return (await ax.get('/metrics/api/daily-api-metrics/_agg?' + params.toString())).data
}

const totals = (result: any) => result.series.map((s: any) => [s.key, s.nbRequests])

describe('aggregation of daily metrics', () => {
  before(startApiServer)
  before(clean)
  before(async () => { await mongo.db.collection('daily-api-metrics').insertMany(fixtures.map(toDoc)) })
  after(clean)
  after(stopApiServer)

  describe('series format (default)', () => {
    it('splits by day by default, filling every day of the period', async () => {
      const result = await agg({ start: '2026-02-28' })
      assert.equal(result.nbRequests, 28)
      assert.equal(result.bytes, 2800)
      assert.deepEqual(result.days, ['2026-02-28', '2026-03-01', '2026-03-02', '2026-03-03'])
      assert.equal(result.series.length, 1)
      assert.deepEqual(result.series[0].key, {})
      const days = result.series[0].days
      assert.deepEqual(Object.keys(days), ['2026-03-01', '2026-03-02', '2026-03-03'])
      assert.equal(days['2026-03-01'].nbRequests, 12)
      assert.equal(days['2026-03-01'].bytes, 1200)
      assert.ok(Math.abs(days['2026-03-01'].meanDuration - 0.25) < 1e-9)
      assert.equal(days['2026-03-03'].nbRequests, 12)
    })

    it('splits by resource, sorted by number of requests, without days', async () => {
      const result = await agg({ split: 'resource' })
      assert.equal(result.days, undefined)
      assert.deepEqual(totals(result), [
        [{ resource: { type: 'datasets', id: 'd1', title: 'Title d1' } }, 17],
        [{ resource: { type: 'applications', id: 'app1', title: 'Title app1' } }, 7],
        [{ resource: { type: 'datasets', id: 'd2', title: 'Title d2' } }, 4]
      ])
      assert.equal(result.series[0].days, undefined)
    })

    it('splits by day and a dimension, with a day map per serie', async () => {
      const result = await agg({ split: 'day,userClass' })
      assert.deepEqual(result.days, ['2026-03-01', '2026-03-02', '2026-03-03'])
      assert.deepEqual(totals(result), [[{ userClass: 'anonymous' }, 22], [{ userClass: 'external' }, 4], [{ userClass: 'owner' }, 2]])
      assert.deepEqual(Object.keys(result.series[0].days), ['2026-03-01', '2026-03-03'])
      assert.equal(result.series[0].days['2026-03-03'].nbRequests, 12)
    })

    it('splits by every dimension', async () => {
      assert.deepEqual(totals(await agg({ split: 'operationTrack' })), [[{ operationTrack: 'readDataAPI' }, 19], [{ operationTrack: 'openApplication' }, 7], [{ operationTrack: 'readDataFiles' }, 2]])
      assert.deepEqual(totals(await agg({ split: 'statusClass' })), [[{ statusClass: 'ok' }, 24], [{ statusClass: 'clientError' }, 4]])
      assert.deepEqual(totals(await agg({ split: 'refererDomain' })), [[{ refererDomain: 'a.fr' }, 22], [{ refererDomain: 'b.fr' }, 4], [{ refererDomain: 'localhost' }, 2]])
      assert.deepEqual(totals(await agg({ split: 'userClass,operationTrack' }))[0], [{ userClass: 'anonymous', operationTrack: 'readDataAPI' }, 15])
    })

    it('groups legacy records without refererCategory with "other"', async () => {
      assert.deepEqual(totals(await agg({ split: 'refererCategory' })), [
        [{ refererCategory: 'other' }, 11],
        [{ refererCategory: 'embed' }, 10],
        [{ refererCategory: 'app' }, 5],
        [{ refererCategory: 'backoffice' }, 2]
      ])
    })

    it('keeps only requests with a referer application when splitting by refererApp', async () => {
      const result = await agg({ split: 'refererApp' })
      assert.equal(result.nbRequests, 5)
      assert.deepEqual(totals(result), [[{ refererApp: 'carte' }, 5]])
    })

    it('returns the totals of the period with an empty split', async () => {
      const result = await agg({ split: '' })
      assert.equal(result.nbRequests, 28)
      assert.equal(result.days, undefined)
      assert.deepEqual(totals(result), [[{}, 28]])
    })

    it('filters by each dimension, with single values and repeated keys', async () => {
      const nb = async (query: Record<string, string | string[]>) => (await agg({ split: 'resource', ...query })).nbRequests
      assert.equal(await nb({ statusClass: 'ok' }), 24)
      assert.equal(await nb({ operationTrack: 'readDataAPI' }), 19)
      assert.equal(await nb({ resourceType: 'applications' }), 7)
      assert.equal(await nb({ userClass: 'owner' }), 2)
      assert.equal(await nb({ userClass: ['anonymous', 'external'] }), 26)
      assert.equal(await nb({ resourceId: 'd2' }), 4)
      assert.equal(await nb({ resourceId: ['d1', 'd2'] }), 21)
      assert.equal(await nb({ refererDomain: 'a.fr' }), 22)
      assert.equal(await nb({ refererDomain: ['b.fr', 'localhost'] }), 6)
      assert.equal(await nb({ refererCategory: 'embed' }), 10)
      // legacy records without refererCategory match "other"
      assert.equal(await nb({ refererCategory: 'other' }), 11)
      assert.equal(await nb({ refererCategory: ['other', 'backoffice'] }), 13)
      // like the embed home page: several filters together
      assert.equal(await nb({ statusClass: 'ok', operationTrack: 'readDataAPI', resourceId: ['d1'], refererDomain: ['a.fr'] }), 15)
    })

    it('only aggregates the metrics of the active account, including its departments', async () => {
      const result = await agg({ split: 'resource' }, orgAx)
      assert.deepEqual(totals(result), [
        [{ resource: { type: 'datasets', id: 'd1', title: 'Title d1' } }, 100],
        [{ resource: { type: 'datasets', id: 'd5', title: 'Title d5' } }, 50],
        [{ resource: { type: 'datasets', id: 'd6', title: 'Title d6' } }, 20]
      ])
    })

    it('only aggregates the metrics of the active department', async () => {
      for (const format of ['series', 'rows']) {
        const result = await agg({ split: 'resource', format }, depAx)
        assert.equal(result.nbRequests, 50, format)
      }
      assert.deepEqual(totals(await agg({ split: 'resource' }, depAx)), [[{ resource: { type: 'datasets', id: 'd5', title: 'Title d5' } }, 50]])
    })

    it('rejects invalid queries', async () => {
      const status = async (query: Record<string, string>) => {
        const params = new URLSearchParams(query)
        return (await adminAx.get('/metrics/api/daily-api-metrics/_agg?' + params.toString(), { validateStatus: () => true })).status
      }
      assert.equal(await status({ end: '2026-03-03' }), 400)
      assert.equal(await status({ start: '2026-03-01', end: '2026-03-03', split: 'owner' }), 400)
      assert.equal(await status({ start: '2026-03-01', end: '2026-03-03', userClass: 'robot' }), 400)
      assert.equal(await status({ start: '2026-03-01', end: '2026-03-03', format: 'csv' }), 400)
      assert.equal(await status({ start: '2026-03-01', end: '2026-03-03', format: 'rows', size: '0' }), 400)
    })
  })

  describe('rows format', () => {
    it('returns flat rows with the totals and the number of groups', async () => {
      const result = await agg({ split: 'day,resource', format: 'rows' })
      assert.equal(result.nbRequests, 28)
      assert.equal(result.bytes, 2800)
      assert.equal(result.count, 4)
      assert.deepEqual(result.results.map((r: any) => [r.day, r.resourceId, r.nbRequests]), [
        ['2026-03-01', 'd1', 12],
        ['2026-03-02', 'd2', 4],
        ['2026-03-03', 'app1', 7],
        ['2026-03-03', 'd1', 5]
      ])
      assert.deepEqual(result.results[0], { day: '2026-03-01', resourceType: 'datasets', resourceId: 'd1', resourceTitle: 'Title d1', nbRequests: 12, bytes: 1200, meanDuration: 0.25 })
    })

    it('truncates to size but keeps the totals of every group', async () => {
      const result = await agg({ split: 'resource', format: 'rows', size: '1' })
      assert.equal(result.count, 3)
      assert.equal(result.nbRequests, 28)
      assert.deepEqual(result.results.map((r: any) => r.resourceId), ['d1'])
    })

    for (const split of ['resource', 'userClass', 'operationTrack', 'statusClass', 'refererDomain', 'refererCategory', 'refererApp', '']) {
      it(`gives the same groups as the series format when splitting by "${split}"`, async () => {
        const filters = { statusClass: 'ok', userClass: ['anonymous', 'owner'] }
        const series = await agg({ split, ...filters })
        const rows = await agg({ split, ...filters, format: 'rows' })
        assert.equal(rows.nbRequests, series.nbRequests)
        assert.equal(rows.bytes, series.bytes)
        assert.equal(rows.count, series.series.length)
        const flatKey = (key: any) => key.resource ? { resourceType: key.resource.type, resourceId: key.resource.id } : key
        assert.deepEqual(
          rows.results.map((r: any) => { const { nbRequests, bytes, meanDuration, resourceTitle, ...key } = r; return [key, nbRequests] }),
          series.series.map((s: any) => [flatKey(s.key), s.nbRequests])
        )
      })
    }
  })
})
