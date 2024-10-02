import neostandard from 'neostandard'
import pluginVue from 'eslint-plugin-vue'
import dfLibRecommended from '@data-fair/lib/eslint/recommended.js'
// cf https://github.com/vuetifyjs/eslint-plugin-vuetify/pull/98
// @ts-ignore
import vuetify from 'eslint-plugin-vuetify/src/index.js'

export default [
  ...dfLibRecommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    plugins: { vuetify },
    rules: {
      ...vuetify.configs.base.rules,
      'vue/multi-word-component-names': 'off'
    }
  },
  ...neostandard({ ts: true }),
  { ignores: ['dist/*'] },
]
