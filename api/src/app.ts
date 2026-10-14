import { resolve } from 'node:path'
import express from 'express'
import { session, errorHandler, createSiteMiddleware, createSpaMiddleware, reqOrigin, reqSitePathSafe } from '@data-fair/lib-express/index.js'
import dailyApiMetricsRouter from './daily-api-metrics/router.ts'
import adminRouter from './admin.ts'
import apiDocs from '../contract/api-docs.ts'
import { readAgentSkill } from '../contract/skills.ts'
import config, { uiConfig } from '#config'

export const app = express()

// no fancy embedded arrays, just string and arrays of strings in req.query
app.set('query parser', 'simple')

app.use(createSiteMiddleware('metrics'))

app.use(session.middleware())

// public, read by agents through the data-fair deployment index (/data-fair/api/v1/agents/index.json)
app.get('/api/api-docs.json', (req, res) => {
  res.json(apiDocs(`${reqOrigin(req)}${reqSitePathSafe(req)}/metrics`))
})

// the bodies of the document's skills, linked from its x-agent.skills; public like the document
app.get('/api/agents/skills/:file', (req, res) => {
  const body = req.params.file.endsWith('.md') ? readAgentSkill(req.params.file.slice(0, -3)) : undefined
  if (!body) return res.status(404).send('unknown skill')
  res.set('Cache-Control', 'public, max-age=300')
  res.type('text/markdown').send(body)
})

app.use('/api/daily-api-metrics', dailyApiMetricsRouter)
app.use('/api/admin', adminRouter)

app.use(await createSpaMiddleware(resolve(import.meta.dirname, '../../ui/dist'), uiConfig, {
  csp: {
    nonce: true,
    header: true
  },
  privateDirectoryUrl: config.privateDirectoryUrl
}))

app.use(errorHandler)
