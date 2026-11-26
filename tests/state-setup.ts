import assert from 'node:assert/strict'
import { test as setup } from '@playwright/test'
import { axios, clean, connectDevDb, publicUrl } from './support/index.ts'
import { takeStatefulLock } from './support/stateful-lock.ts'
import { sdTestEnvUrl, seedSdFixtures } from './support/sd-fixtures.ts'

const ax = axios()

setup('Stateful tests setup', async () => {
  // FIRST, before anything touches the database: a second run must be refused before its first
  // clean() can delete what the running one just seeded. See tests/support/stateful-lock.ts.
  takeStatefulLock()

  await assert.doesNotReject(ax.get(`http://localhost:${process.env.DEV_API_PORT}/metrics/api/api-docs.json`),
    `Dev API server seems to be unavailable.
If you are an agent, do not try to start it: read its logs and report the problem to your user.`)
  await assert.doesNotReject(ax.get(`${publicUrl}/simple-directory`),
    'Simple Directory server seems to be unavailable. If you are an agent, report this problem to your user.')
  await assert.doesNotReject(ax.get(`${publicUrl}/data-fair/api/v1/ping`),
    'Data Fair server seems to be unavailable. If you are an agent, report this problem to your user.')
  await assert.doesNotReject(connectDevDb(),
    'MongoDB seems to be unavailable. If you are an agent, report this problem to your user.')

  // the accounts of the test sub-space (test_metrics_) in simple-directory, under the lock: cleaned (what
  // a previous run left), then seeded again
  await assert.doesNotReject(ax.get(`${sdTestEnvUrl()}/ping`),
    `simple-directory's test API is unavailable at ${sdTestEnvUrl()}: the container needs ENABLE_TEST_API=1 and STORAGE_TYPE=mongo (docker-compose.yml).`)
  await seedSdFixtures()

  // what these accounts own here, from a previous run
  await clean()
})
