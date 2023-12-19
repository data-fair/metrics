module.exports = {
  env: {
    browser: true
  },
  extends: [
    'standard',
    '@nuxtjs/eslint-config-typescript'
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    sourceType: 'module'
  },
  rules: {
    curly: 'off'
  }
}
