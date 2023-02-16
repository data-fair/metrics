#!/usr/bin/env node
const { spawnSync } = require('node:child_process')

for (const key of ['config']) {
  const schema2td = `schema2td types/${key}/${key}.schema.json types/${key}/${key}.jtd.json`
  console.log(`> ${schema2td}`)
  spawnSync(
    `npx --package @koumoul/schema-jtd@0.1.1 ${schema2td}`,
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
}