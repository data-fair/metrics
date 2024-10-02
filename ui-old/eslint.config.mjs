// TODO: use this config when eslint-plugin-vuetify is compatible with eslint 9
// see https://github.com/vuetifyjs/eslint-plugin-vuetify/issues/93

import neostandard from 'neostandard'
import dfLibNuxtRecommended from '@data-fair/lib/eslint/nuxt-recommended.js'
// cf https://github.com/vuetifyjs/eslint-plugin-vuetify/pull/98
// @ts-ignore
import vuetify from 'eslint-plugin-vuetify/src/index.js'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt([
  ...dfLibNuxtRecommended,
  {
    files: ['**/*.vue'],
    plugins: { vuetify },
    rules: {
      ...vuetify.configs.base.rules
    }
  },
  ...neostandard({ ts: true })
])
