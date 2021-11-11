const config = require('config')
const express = require('express')
const eventToPromise = require('event-to-promise')
const dbUtils = require('../utils/db')
const session = require('@koumoul/sd-express')({
  directoryUrl: config.directoryUrl,
  privateDirectoryUrl: config.privateDirectoryUrl || config.directoryUrl
})

const app = express()

app.set('trust proxy', 1)
app.set('json spaces', 2)

if (process.env.NODE_ENV === 'development') {
  // Create a mono-domain environment with other services in dev
  const { createProxyMiddleware } = require('http-proxy-middleware')
  app.use('/openapi-viewer', createProxyMiddleware({ target: 'http://localhost:5680', pathRewrite: { '^/openapi-viewer': '' } }))
  app.use('/simple-directory', createProxyMiddleware({ target: 'http://localhost:6201', pathRewrite: { '^/simple-directory': '' } }))
  app.use('/data-fair', createProxyMiddleware({ target: 'http://localhost:6202', pathRewrite: { '^/data-fair': '' } }))
}

app.use(require('body-parser').json())
app.use(require('cookie-parser')())
app.use(session.auth)

// Business routers
app.use('/api/v1/daily-api-metrics', require('./routers/daily-api-metrics'))

const server = require('http').createServer(app)

// Run app and return it in a promise
exports.run = async () => {
  const { db, client } = await dbUtils.connect()
  await dbUtils.init(db)
  app.set('db', db)
  app.set('mongoClient', client)
  app.use(session.requiredAuth)
  const nuxt = await require('./nuxt')()
  app.set('nuxt', nuxt.instance)
  app.use(nuxt.render)
  server.listen(config.port)
  await eventToPromise(server, 'listening')
  return app
}

exports.stop = async () => {
  server.close()
  app.get('mongoClient').close()
}
