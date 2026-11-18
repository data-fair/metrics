import assert from 'node:assert/strict'
import { test as setup } from '@playwright/test'
import { axios, connectDevDb, publicUrl } from './support/index.ts'

const ax = axios()

setup('Stateful tests setup', async () => {
  await assert.doesNotReject(ax.get(`http://localhost:${process.env.DEV_API_PORT}/metrics/api/api-docs.json`),
    `Dev API server seems to be unavailable.
If you are an agent, read its logs with "npx --no df-dev logs api" and report the problem to your user (or "npx --no df-dev restart api" if the pane exited).`)
  await assert.doesNotReject(ax.get(`${publicUrl}/simple-directory`),
    'Simple Directory server seems to be unavailable. If you are an agent, check "npx --no df-dev status" and report this problem to your user.')
  await assert.doesNotReject(ax.get(`${publicUrl}/data-fair/api/v1/ping`),
    'Data Fair server seems to be unavailable. If you are an agent, check "npx --no df-dev status" and report this problem to your user.')
  await assert.doesNotReject(connectDevDb(),
    'MongoDB seems to be unavailable. If you are an agent, check "npx --no df-dev status" and report this problem to your user.')
})
