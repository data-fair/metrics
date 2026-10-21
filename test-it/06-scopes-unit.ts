import { describe, it } from 'node:test'
import { strict as assert } from 'node:assert'
import { acceptedScopes, scopedOperations, scopeDescriptions, requireOperationScope } from '../api/src/scopes.ts'
import apiDocs from '../api/contract/api-docs.ts'

describe('scope vocabulary', () => {
  it('accepted scopes of the metrics read tier', () => {
    assert.deepEqual(acceptedScopes('metrics', 'read'), ['metrics:read', 'metrics', 'all:read', 'all:write', 'all:admin'])
  })

  it('operation table', () => {
    assert.deepEqual(scopedOperations, {
      listDailyApiMetrics: { method: 'get', path: '/daily-api-metrics', family: 'metrics', tier: 'read' },
      aggDailyApiMetrics: { method: 'get', path: '/daily-api-metrics/_agg', family: 'metrics', tier: 'read' },
      exportDailyApiMetrics: { method: 'get', path: '/daily-api-metrics/_export', family: 'metrics', tier: 'read' }
    })
  })

  it('every scope is described, in both locales', () => {
    const keys = ['metrics', 'metrics:read', 'all:read', 'all:write', 'all:admin']
    assert.deepEqual(Object.keys(scopeDescriptions('fr')).sort(), [...keys].sort())
    assert.deepEqual(Object.keys(scopeDescriptions('en')).sort(), [...keys].sort())
  })

  it('an unknown operation fails at declaration', () => {
    assert.throws(() => requireOperationScope('nope' as any))
  })
})

describe('OpenAPI document', () => {
  const doc: any = apiDocs('fr')
  const operations = Object.values(doc.paths).flatMap((methods: any) => Object.values(methods)) as any[]
  const oauth2Of = (op: any) => op.security.filter((s: any) => s.oauth2).map((s: any) => s.oauth2)

  it('every documented operation is in the table, with one security alternative per accepted scope', () => {
    for (const op of operations) {
      const row = scopedOperations[op.operationId as keyof typeof scopedOperations]
      assert.ok(row, op.operationId)
      // standard OpenAPI: the scopes of one requirement are all needed, so each accepted scope is its own alternative
      assert.deepEqual(op.security, [{ sdCookie: [] }, ...acceptedScopes(row.family, row.tier).map(scope => ({ oauth2: [scope] }))], op.operationId)
    }
    assert.deepEqual(operations.map(op => op.operationId).sort(), ['aggDailyApiMetrics', 'exportDailyApiMetrics'])
  })

  it('every scope used is declared in the oauth2 scheme', () => {
    const scheme = doc.components.securitySchemes.oauth2
    const declared = Object.keys(scheme.flows.clientCredentials.scopes)
    for (const op of operations) {
      for (const scope of oauth2Of(op).flat()) assert.ok(declared.includes(scope), scope)
    }
    assert.equal(scheme['x-scopeIncludes'], undefined)
  })

  it('the document does not depend on the request origin', () => {
    // data-fair fetches it over the private url and sets the site origin itself
    assert.deepEqual(doc.servers, [{ url: '/metrics/api' }])
    assert.equal(doc.components.securitySchemes.oauth2.flows.clientCredentials.tokenUrl, '/simple-directory/api/auth/nhi-token')
  })

  it('scope descriptions follow the locale', () => {
    assert.equal(apiDocs('en').components.securitySchemes.oauth2.flows.clientCredentials.scopes['metrics:read'], scopeDescriptions('en')['metrics:read'])
    assert.equal(doc.components.securitySchemes.oauth2.flows.clientCredentials.scopes['metrics:read'], scopeDescriptions('fr')['metrics:read'])
  })
})
