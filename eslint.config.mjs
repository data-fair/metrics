import neostandard from 'neostandard'
import dfLibRecommended from '@data-fair/lib-utils/eslint/recommended.js'

export default [
  { ignores: ['ui/*', 'ui-old/*', '**/.type/'] },
  ...dfLibRecommended,
  ...neostandard({ ts: true })
]
