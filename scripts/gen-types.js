#!/usr/bin/env node

const {compile} = require('json-schema-to-typescript')
const fs = require('node:fs');

(async () => {
  for (const key of fs.readdirSync('types')) {
    console.log(`compute ${key}`)
    const schema = require(`../types/${key}/schema`)
    const ts = await compile(schema, key)
    const camelCase = await import('camelcase')
    fs.writeFileSync(`types/${key}/index.ts`,  `
export { default as ${camelCase.default(key)}Schema } from './schema.json'

${ts}`)
  }
})()

/*
keep for reference a version using schema2td + jtd-codegen

const { spawnSync } = require('node:child_process')

for (const key of ['agg-result']) {
  const schema2td = `schema2td types/${key}/${key}.schema.json types/${key}/${key}.jtd.json`
  console.log(`> ${schema2td}`)
  spawnSync(
    `npx --package @koumoul/schema-jtd@0.3.0 ${schema2td}`,
    [],
    {shell: true, stdio: 'inherit'}
  )

  const jtdCodegen = `jtd-codegen types/${key}/${key}.jtd.json --typescript-out types/${key}`
  console.log(`> ${jtdCodegen}`)
  spawnSync(
    `docker compose run --rm jtd ${jtdCodegen}`,
    [],
    {shell: true, stdio: 'inherit'}
  )
}*/