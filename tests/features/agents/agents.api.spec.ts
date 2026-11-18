/**
 * The agent api docs as the API serves them, and the agent tool calling the running API.
 */
import { test } from '@playwright/test'
import { strict as assert } from 'node:assert'
import { load } from '@data-fair/openapi-mcp'
import apiDocs from '../../../api/contract/api-docs.ts'
import { axios, axiosAuth, clean, dailyApiMetrics, publicUrl } from '../../support/index.ts'
import type { AxiosAuth } from '../../support/index.ts'

const baseUrl = `${publicUrl}/metrics/api`

let adminAx: AxiosAuth
let cookie: string

const metric = (day: string, resourceId: string, operationTrack: string, userClass: string, nbRequests: number) => ({
  owner: { type: 'user', id: 'superadmin', name: 'Super Admin' },
  day,
  resource: { type: 'datasets', id: resourceId, title: `Dataset ${resourceId}` },
  operationTrack,
  statusClass: 'ok',
  userClass,
  refererDomain: 'localhost',
  refererCategory: 'backoffice',
  nbRequests,
  bytes: nbRequests * 100,
  duration: nbRequests * 0.5
})

test.describe('agent api docs served by the api', () => {
  // logged in once per worker, after the state setup checked the dev env
  test.beforeAll(async () => {
    adminAx = await axiosAuth({ email: 'superadmin@test.com', adminMode: true })
    cookie = adminAx.cookieJar.getCookieStringSync(publicUrl)
  })

  test.beforeEach(clean)

  test('serves the document anonymously, without forwarded headers, for data-fair to merge', async () => {
    const res = await axios().get('/metrics/api/api-docs.json', { headers: { 'x-forwarded-host': '', 'x-forwarded-proto': '' } })
    assert.equal(res.status, 200)
    assert.equal(res.data.servers[0].url, '/metrics/api')
    assert.equal(res.data['x-agent'].namePrefix, undefined)
    assert.equal(res.data['x-agent'].profiles, undefined)
    assert.deepEqual(res.data['x-agent'].skills[0].tools, ['aggregate_requests'])
    assert.equal(JSON.stringify(res.data).includes('"profiles"'), false)
    assert.equal(res.data['x-agent'].skills[0].href, 'agents/skills/metrics-review.md')
    const skill = await axios().get('/metrics/api/agents/skills/metrics-review.md')
    assert.match(String(skill.headers['content-type']), /text\/markdown/)
    assert.match(skill.data, /^# Reviewing the audience of an account/)
    assert.equal((await axios().get('/metrics/api/agents/skills/nope.md', { validateStatus: () => true })).status, 404)
  })

  test('serves the scope descriptions in the requested language, cacheable', async () => {
    const fr = await axios().get('/metrics/api/api-docs.json')
    assert.equal(Object.keys(fr.data.components.securitySchemes.oauth2.flows.clientCredentials.scopes).length, 5)
    assert.match(fr.headers.vary, /Accept-Language/)
    assert.match(String(fr.headers['cache-control']), /max-age=300/)
    const en = await axios().get('/metrics/api/api-docs.json', { headers: { 'accept-language': 'en' } })
    assert.equal(en.data.components.securitySchemes.oauth2.flows.clientCredentials.scopes['metrics:read'], "Read the audience metrics of the account's datasets and applications")
    assert.notEqual(fr.data.components.securitySchemes.oauth2.flows.clientCredentials.scopes['metrics:read'], en.data.components.securitySchemes.oauth2.flows.clientCredentials.scopes['metrics:read'])
  })

  test('aggregates metrics as flat rows through the agent tool', async () => {
    await (await dailyApiMetrics()).insertMany([
      metric('2026-01-01', 'd1', 'readDataAPI', 'anonymous', 10),
      metric('2026-01-01', 'd1', 'readDataFiles', 'owner', 2),
      metric('2026-01-02', 'd1', 'readDataAPI', 'external', 5),
      metric('2026-01-02', 'd2', 'readDataAPI', 'anonymous', 30),
      { ...metric('2026-01-02', 'd3', 'readDataAPI', 'anonymous', 1000), owner: { type: 'user', id: 'other' } }
    ])
    const toolSet = await load(apiDocs(), { baseUrl })
    const tool = toolSet.tools[0]
    const call = async (params: Record<string, unknown>) => {
      const result = await tool.execute({ start: '2026-01-01', end: '2026-01-31', ...params }, { headers: { cookie } })
      assert.ok(!result.isError, result.text)
      return result.text
    }

    const byResource = await call({ split: ['resource'] })
    assert.match(byResource, /\*\*nbRequests\*\*: 47/)
    assert.match(byResource, /\*\*count\*\*: 2/)
    const lines = byResource.split('\n').filter(l => l.startsWith('| datasets'))
    assert.equal(lines.length, 2)
    assert.match(lines[0], /\| datasets \| d2 \| Dataset d2 \| 30 \|/, 'sorted by number of requests')

    const totals = await call({ split: [] })
    assert.match(totals, /\*\*count\*\*: 1/)

    const filtered = await call({ split: ['day', 'operationTrack'], userClass: ['anonymous', 'external'], resourceId: ['d1'] })
    assert.match(filtered, /\*\*nbRequests\*\*: 15/)
    assert.match(filtered, /\| 2026-01-01 \| readDataAPI \| 10 \|/)
    assert.match(filtered, /\| 2026-01-02 \| readDataAPI \| 5 \|/)

    const limited = await call({ split: ['day', 'resource'], size: 1 })
    assert.match(limited, /\*\*count\*\*: 3/)
    assert.equal(limited.split('\n').filter(l => l.startsWith('| 2026')).length, 1)
  })

  test('keeps the series format as the default of the aggregation route', async () => {
    await (await dailyApiMetrics()).insertMany([metric('2026-01-01', 'd1', 'readDataAPI', 'anonymous', 10)])
    const res = await adminAx.get('/metrics/api/daily-api-metrics/_agg', { params: { start: '2026-01-01', end: '2026-01-02' } })
    assert.deepEqual(res.data.days, ['2026-01-01', '2026-01-02'])
    assert.equal(res.data.series[0].days['2026-01-01'].nbRequests, 10)
  })
})
