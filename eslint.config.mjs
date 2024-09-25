import neostandard from 'neostandard'
import dfLibRecommended from '@data-fair/lib/eslint/recommended.js'

export default [
  { ignores: ['ui/*', '**/.type/'] },
  ...dfLibRecommended,
  ...neostandard({ ts: true })
]
