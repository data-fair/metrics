import express from 'express'
import { initSession } from '@data-fair/lib/express/session'
import config from './config'

export const app = express()

app.set('test', 'HELLO')

const session = initSession({ directoryUrl: config.directoryUrl })
app.use(session.auth)

app.use((req, res, next) => {
  next()
})

app.get('/v1/hello', function (req, res) {
  res.send('Hello World !')
})
