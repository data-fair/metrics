module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    // project: './tsconfig.json'
    project: require('path').resolve(__dirname, "tsconfig.json")
  },
  extends: ['standard-with-typescript'],
  env: {
    node: true // Enable Node.js global variables
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 0,
    '@typescript-eslint/restrict-template-expressions': 0,
    '@typescript-eslint/strict-boolean-expressions': 0,
    '@typescript-eslint/consistent-type-assertions': 0
  }
}