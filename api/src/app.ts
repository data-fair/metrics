import express from 'express'
import { session, errorHandler } from '@data-fair/lib/express/index.js'
import dailyApiMetricsRouter from './daily-api-metrics/router.ts'
import adminRouter from './admin.ts'

export const app = express()

// no fancy embedded arrays, just string and arrays of strings in req.query
app.set('query parser', 'simple')

app.use(session.middleware())

app.use('/metrics/api/v1/daily-api-metrics', dailyApiMetricsRouter)
app.use('/metrics/api/v1/admin', adminRouter)

app.use(errorHandler)
