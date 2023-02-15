import http from 'http'
import { createHttpTerminator } from 'http-terminator'
import config from '~/config'
import { app } from '~/app'
import * as db from '~/db'
app.get('test')
const server = http.createServer(app)
// cf https://connectreport.com/blog/tuning-http-keep-alive-in-node-js/
// timeout is often 60s on the reverse proxy, better to a have a longer one here
// so that interruption is managed downstream instead of here
server.keepAliveTimeout = (60 * 1000) + 1000
server.headersTimeout = (60 * 1000) + 2000
const httpTerminator = createHttpTerminator({ server })

export const start = async () => {
  await db.connect()
  server.listen(config.port)
  await new Promise(resolve => server.once('listening', resolve))
  console.info(`listening on localhost:6219, exposed on ${config.publicUrl}`)
}

export const stop = async () => {
  await httpTerminator.terminate()
}
