import express from 'express'
import { initSession } from '@data-fair/lib/express/session'
import config from './config'

export const app = express()

const session = initSession({ directoryUrl: config.directoryUrl })
app.use(session.requiredAuth)

app.use((req, res, next) => {
  next()
})

app.get('/v1/hello', function (req, res) {
  res.send('Hello World !')
})
