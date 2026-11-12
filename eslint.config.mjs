import neostandard from 'neostandard'
import dfLibRecommended from '@data-fair/lib-utils/eslint/recommended.js'

export default [
  { ignores: ['ui/*', '**/.type/', 'data/'] },
  ...dfLibRecommended,
  ...neostandard({ ts: true }),
  {
    // server code logs through @data-fair/lib-node/log.js (its README, "Logging")
    files: ['api/src/**/*.ts', 'api/index.ts', 'daemon/src/**/*.ts', 'daemon/index.ts'],
    rules: { 'no-console': 'error' }
  }
]
