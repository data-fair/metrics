/**
 * The agent-facing surface of this API: what `@data-fair/openapi-mcp` generates from the
 * x-agent annotations in the served document. `lint: 'error'` refuses a description that
 * contradicts its schema; the golden turns any change to a tool's name, description or schema
 * into a diff a reviewer sees. Regenerate with UPDATE_GOLDEN=1 when the change is intended.
 */
import { test } from '@playwright/test'
import { strict as assert } from 'node:assert'
import path from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'
import { load, toolSetSnapshot, toolsForScopes } from '@data-fair/openapi-mcp'
import apiDocs from '../../../api/contract/api-docs.ts'
import { readAgentSkill } from '../../../api/contract/skills.ts'

const goldenPath = path.resolve(import.meta.dirname, '../../resources/agent-surface.json')
// any origin: the document's servers are relative, the skills are served by skillFetch below
const baseUrl = 'http://localhost/metrics/api'

/** Serves what the API serves at /metrics/api/agents/skills/<name>.md, without the API. */
const skillFetch = (async (input: RequestInfo | URL) => {
  const url = input instanceof Request ? input.url : String(input)
  const prefix = `${baseUrl}/agents/skills/`
  const body = url.startsWith(prefix) && url.endsWith('.md') ? readAgentSkill(url.slice(prefix.length, -3)) : undefined
  return body ? new Response(body, { headers: { 'content-type': 'text/markdown' } }) : new Response('not found', { status: 404 })
}) as typeof fetch

test.describe('agent surface of the api docs', () => {
  test('tools load without a lint error and match the golden', async () => {
    const toolSet = await load(apiDocs(), { fetch: skillFetch, baseUrl, lint: 'error' })
    assert.deepEqual(toolSet.tools.map(t => t.name), ['aggregate_requests'])
    assert.deepEqual(toolSet.skills.map(s => s.name), ['review'])
    assert.equal(toolSet.skills[0].error, undefined, 'the linked body is read, so the golden pins its real digest')
    assert.match(toolSet.skills[0].body, /^# Reviewing the audience of an account/)
    assert.ok(toolSet.skills[0].description.length <= 1024)
    assert.doesNotMatch(toolSet.skills[0].description, /Dimensions:/, 'the body is not in the description the instructions list')
    // Through JSON: the golden is a file, and an `enum: undefined` left by the generator is not.
    const snapshot = JSON.parse(JSON.stringify(toolSetSnapshot(toolSet)))
    if (process.env.UPDATE_GOLDEN) writeFileSync(goldenPath, JSON.stringify(snapshot, null, 2) + '\n')
    assert.deepEqual(snapshot, JSON.parse(readFileSync(goldenPath, 'utf8')))
  })
})

test.describe('agent tools offered to scoped tokens', () => {
  test('the metrics scopes and the global tier scopes reach the tool, other families do not', async () => {
    const toolSet = await load(apiDocs(), { fetch: skillFetch, baseUrl, lint: 'error' })
    const names = (scopes?: string[]) => toolsForScopes(toolSet, scopes).tools.map(t => t.name)
    for (const scope of ['metrics:read', 'metrics', 'all:read', 'all:write', 'all:admin']) assert.deepEqual(names([scope]), ['aggregate_requests'], scope)
    assert.deepEqual(names(['datasets:read']), [])
    assert.deepEqual(toolsForScopes(toolSet, ['datasets:read']).skills, [])
    assert.deepEqual(names(undefined), ['aggregate_requests'])
  })
})
