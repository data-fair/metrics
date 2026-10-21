// The OAuth-style scope vocabulary metrics declares: the metrics family with a read tier and its
// bare umbrella, plus the global tier scopes all:read / all:write / all:admin shared by every service
// of the platform. Every session-facing route is listed in scopedOperations and guarded by
// requireOperationScope; any other route refuses scope-restricted sessions (lib-express).
// The OpenAPI document (api/contract/api-docs.ts) is built from the same table.
import type { RequestHandler } from 'express'
import type { ScopeTier } from '@data-fair/lib-common-types/scopes.js'
import { defineScopes } from '@data-fair/lib-common-types/scopes.js'
import { requireScope } from '@data-fair/lib-express/index.js'

export const vocabulary = defineScopes({
  metrics: {
    tiers: ['read'],
    descriptions: {
      umbrella: { fr: "Tous les droits sur les métriques d'audience", en: 'All audience metrics scopes' },
      read: { fr: "Lire les métriques d'audience des jeux de données et applications du compte", en: "Read the audience metrics of the account's datasets and applications" }
    }
  }
})
export const { acceptedScopes, scopeDescriptions } = vocabulary
export type ScopeFamily = typeof vocabulary.families[number]

export type ScopedOperation = { method: 'get', path: string, family: ScopeFamily, tier: ScopeTier }

// paths are relative to /api, as in the OpenAPI document
export const scopedOperations = {
  listDailyApiMetrics: { method: 'get', path: '/daily-api-metrics', family: 'metrics', tier: 'read' },
  aggDailyApiMetrics: { method: 'get', path: '/daily-api-metrics/_agg', family: 'metrics', tier: 'read' },
  exportDailyApiMetrics: { method: 'get', path: '/daily-api-metrics/_export', family: 'metrics', tier: 'read' }
} satisfies Record<string, ScopedOperation>

export type ScopedOperationId = keyof typeof scopedOperations

export const requireOperationScope = (operationId: ScopedOperationId): RequestHandler => {
  const operation: ScopedOperation | undefined = scopedOperations[operationId]
  if (!operation) throw new Error(`unknown scoped operation ${operationId}`)
  return requireScope(acceptedScopes(operation.family, operation.tier))
}

// the export also reads the account's datasets, applications and topics in data-fair with the
// caller's credentials: data-fair decides on its own scopes, this explains its refusal
export const exportScopesMessage = "the export also reads the account's datasets, applications and topics in data-fair, which refused this session: a scope-restricted session needs datasets:read and applications:read (or all:read) in addition to metrics:read"
