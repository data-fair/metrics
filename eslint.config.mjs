import neostandard from 'neostandard'
import dfLibRecommended from '@data-fair/lib/eslint/recommended.js'

export default [
  { ignores: ['ui/*', 'ui-old/*', '**/.type/'] },
  ...dfLibRecommended,
  ...neostandard({ ts: true })
]
