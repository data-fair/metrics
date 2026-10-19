/**
 * The agent-facing surface of this API: what `@data-fair/openapi-mcp` generates from the
 * x-agent annotations in the served document. `lint: 'error'` refuses a description that
 * contradicts its schema; the golden turns any change to a tool's name, description or schema
 * into a diff a reviewer sees. Regenerate with UPDATE_GOLDEN=1 when the change is intended.
 */
import { describe, it, before, after, beforeEach } from 'node:test'
import { strict as assert } from 'node:assert'
import path from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'
import mongo from '@data-fair/lib-node/mongo.js'
import { load, toolSetSnapshot, toolsForScopes } from '@data-fair/openapi-mcp'
import apiDocs from '../api/contract/api-docs.ts'
import { readAgentSkill } from '../api/contract/skills.ts'
import { axios, axiosAuth, clean, startApiServer, stopApiServer } from './utils/index.ts'

const goldenPath = path.resolve(import.meta.dirname, 'fixtures/agent-surface.json')
const baseUrl = 'http://localhost:5600/metrics/api'

/** Serves what the API serves at /metrics/api/agents/skills/<name>.md, for the tests that run without it. */
const skillFetch = (async (input: RequestInfo | URL) => {
  const url = input instanceof Request ? input.url : String(input)
  const prefix = `${baseUrl}/agents/skills/`
  const body = url.startsWith(prefix) && url.endsWith('.md') ? readAgentSkill(url.slice(prefix.length, -3)) : undefined
  return body ? new Response(body, { headers: { 'content-type': 'text/markdown' } }) : new Response('not found', { status: 404 })
}) as typeof fetch

const adminAx = await axiosAuth({ email: 'superadmin@test.com', adminMode: true })
const cookie = adminAx.cookieJar.getCookieStringSync('http://localhost:5600')

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

describe('agent surface of the api docs', () => {
  it('tools load without a lint error and match the golden', async () => {
    const toolSet = await load(apiDocs(), { fetch: skillFetch, baseUrl, lint: 'error' })
    assert.deepEqual(toolSet.tools.map(t => t.name), ['aggregate_requests'])
    assert.deepEqual(toolSet.skills.map(s => s.id), ['metrics-review'])
    assert.equal(toolSet.skills[0].error, undefined, 'the linked body is read, so the golden pins its real digest')
    assert.match(toolSet.skills[0].body, /^# Reviewing the audience of an account/)
    assert.ok(toolSet.skills[0].description.length <= 1024)
    assert.doesNotMatch(toolSet.instructions, /Dimensions:/, 'the body is not in the instructions')
    // Through JSON: the golden is a file, and an `enum: undefined` left by the generator is not.
    const snapshot = JSON.parse(JSON.stringify(toolSetSnapshot(toolSet)))
    if (process.env.UPDATE_GOLDEN) writeFileSync(goldenPath, JSON.stringify(snapshot, null, 2) + '\n')
    assert.deepEqual(snapshot, JSON.parse(readFileSync(goldenPath, 'utf8')))
  })
})

describe('agent tools offered to scoped tokens', () => {
  it('the metrics scopes and the global tier scopes reach the tool, other families do not', async () => {
    const toolSet = await load(apiDocs(), { fetch: skillFetch, baseUrl, lint: 'error' })
    const names = (scopes?: string[]) => toolsForScopes(toolSet, scopes).tools.map(t => t.name)
    for (const scope of ['metrics:read', 'metrics', 'all:read', 'all:write', 'all:admin']) assert.deepEqual(names([scope]), ['aggregate_requests'], scope)
    assert.deepEqual(names(['datasets:read']), [])
    assert.deepEqual(toolsForScopes(toolSet, ['datasets:read']).skills, [])
    assert.deepEqual(names(undefined), ['aggregate_requests'])
  })
})

describe('agent api docs served by the api', () => {
  before(startApiServer)
  after(stopApiServer)
  beforeEach(clean)

  it('serves the document anonymously, without forwarded headers, for data-fair to merge', async () => {
    const res = await axios().get('/metrics/api/api-docs.json', { headers: { 'x-forwarded-host': '', 'x-forwarded-proto': '' } })
    assert.equal(res.status, 200)
    assert.equal(res.data.servers[0].url, '/metrics/api')
    assert.equal(res.data['x-agent'].namePrefix, undefined)
    assert.equal(res.data['x-agent'].profiles, undefined)
    assert.deepEqual(res.data['x-agent'].skills[0].tools, ['aggregate_requests'])
    assert.equal(JSON.stringify(res.data).includes('"profiles"'), false)
    assert.equal(res.data['x-agent'].skills[0].href, 'agents/skills/metrics-review.md')
    const skill = await axios().get('/metrics/api/agents/skills/metrics-review.md')
    assert.match(skill.headers['content-type'], /text\/markdown/)
    assert.match(skill.data, /^# Reviewing the audience of an account/)
    assert.equal((await axios().get('/metrics/api/agents/skills/nope.md', { validateStatus: () => true })).status, 404)
  })

  it('serves the scope descriptions in the requested language, cacheable', async () => {
    const fr = await axios().get('/metrics/api/api-docs.json')
    assert.equal(Object.keys(fr.data.components.securitySchemes.oauth2.flows.clientCredentials.scopes).length, 5)
    assert.match(fr.headers.vary, /Accept-Language/)
    assert.match(fr.headers['cache-control'], /max-age=300/)
    const en = await axios().get('/metrics/api/api-docs.json', { headers: { 'accept-language': 'en' } })
    assert.equal(en.data.components.securitySchemes.oauth2.flows.clientCredentials.scopes['metrics:read'], "Read the audience metrics of the account's datasets and applications")
    assert.notEqual(fr.data.components.securitySchemes.oauth2.flows.clientCredentials.scopes['metrics:read'], en.data.components.securitySchemes.oauth2.flows.clientCredentials.scopes['metrics:read'])
  })

  it('aggregates metrics as flat rows through the agent tool', async () => {
    await mongo.db.collection('daily-api-metrics').insertMany([
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

  it('keeps the series format as the default of the aggregation route', async () => {
    await mongo.db.collection('daily-api-metrics').insertMany([metric('2026-01-01', 'd1', 'readDataAPI', 'anonymous', 10)])
    const res = await adminAx.get('/metrics/api/daily-api-metrics/_agg', { params: { start: '2026-01-01', end: '2026-01-02' } })
    assert.deepEqual(res.data.days, ['2026-01-01', '2026-01-02'])
    assert.equal(res.data.series[0].days['2026-01-01'].nbRequests, 10)
  })
})
