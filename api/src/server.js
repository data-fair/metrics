import http from 'http'
import { createHttpTerminator } from 'http-terminator'
import mongo from '#mongo'
import { session } from '@data-fair/lib/express/index.js'
import { startObserver, stopObserver } from '@data-fair/lib/node/observer.js'
import config from '#config'
import { app } from './app.js'

const server = http.createServer(app)
const httpTerminator = createHttpTerminator({ server })

// cf https://connectreport.com/blog/tuning-http-keep-alive-in-node-js/
// timeout is often 60s on the reverse proxy, better to a have a longer one here
// so that interruption is managed downstream instead of here
server.keepAliveTimeout = (60 * 1000) + 1000
server.headersTimeout = (60 * 1000) + 2000

export const start = async () => {
  if (config.observer.active) await startObserver()
  await session.init(config.directoryUrl)
  await mongo.init()
  server.listen(config.port)
  await new Promise(resolve => server.once('listening', resolve))
  console.log(`Metrics API available on ${config.origin}/metrics/api/ (listening on port ${config.port})`)
}

export const stop = async () => {
  await httpTerminator.terminate()
  if (config.observer.active) await stopObserver()
  await mongo.client.close()
}
