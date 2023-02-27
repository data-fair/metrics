import express, { type Request, type Response, type NextFunction } from 'express'
import { type HttpError } from 'http-errors'
import { initSession } from '@data-fair/lib/express/session'
import { internalError } from '@data-fair/lib/node/prometheus'
import config from './config'
import dailyApiMetricsRouter from './daily-api-metrics/router'

export const app = express()

// no fancy embedded arrays, just string and arrays of strings in req.query
app.set('query parser', 'simple')

const session = initSession({ directoryUrl: config.directoryUrl })
app.use(session.auth)

app.get('/v1/daily-api-metrics', dailyApiMetricsRouter)

app.use(function (err: HttpError, _req: Request, res: Response, next: NextFunction) {
  // let the default error handler manage closing the connection
  if (res.headersSent) { next(err); return }
  const status = err.status || err.statusCode || 500
  if (status >= 500) {
    internalError('http', 'failure while serving http request', err)
  }
  res.status(status)
  if (process.env.NODE_ENV === 'production') {
    if (status < 500) res.send(err.message)
    else res.send(err.name || 'internal error')
  } else {
    res.send(err.stack)
  }
})
