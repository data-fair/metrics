import { resolve } from 'node:path'
import express from 'express'
import { session, errorHandler, createSiteMiddleware, createSpaMiddleware } from '@data-fair/lib-express/index.js'
import dailyApiMetricsRouter from './daily-api-metrics/router.ts'
import adminRouter from './admin.ts'
import { uiConfig } from '#config'

export const app = express()

// no fancy embedded arrays, just string and arrays of strings in req.query
app.set('query parser', 'simple')

app.use(createSiteMiddleware('metrics'))

app.use(session.middleware())

app.use('/api/daily-api-metrics', dailyApiMetricsRouter)
app.use('/api/admin', adminRouter)

app.use(await createSpaMiddleware(resolve(import.meta.dirname, '../../ui/dist'), uiConfig))

app.use(errorHandler)
