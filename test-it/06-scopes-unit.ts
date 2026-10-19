import { describe, it } from 'node:test'
import { strict as assert } from 'node:assert'
import { acceptedScopes, scopedOperations, scopeDescriptions, scopeIncludes, requireOperationScope } from '../api/src/scopes.ts'

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

  it('global tier inclusions', () => {
    assert.deepEqual(scopeIncludes, {
      'all:read': ['metrics:read'],
      'all:write': ['metrics:read'],
      'all:admin': ['metrics:read']
    })
  })

  it('an unknown operation fails at declaration', () => {
    assert.throws(() => requireOperationScope('nope' as any))
  })
})
