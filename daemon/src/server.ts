import { unlink, chmod } from 'node:fs/promises'
import config from '#config'
// @ts-ignore
import unixDgram from 'unix-dgram'
import mongo from '#mongo'
import { startObserver, stopObserver } from '@data-fair/lib-node/observer.js'
import log from '@data-fair/lib-node/log.js'
import { pushLogLine, getBulk } from './service.ts'
import { parseLogLine } from './operations.ts'

const socket = unixDgram.createSocket('unix_dgram', (data: Buffer) => {
  try {
    pushLogLine(parseLogLine(data.toString()))
  } catch (err) {
    log.error('could not parse log line', { code: 'log-parse', err, line: data.toString() })
  }
})

export const start = async () => {
  if (config.observer.active) await startObserver()
  await mongo.init()

  log.info(`attempt to bind to socket ${config.socketPath}`)
  try {
    await unlink(config.socketPath)
  } catch (err) {
    // nothing to do, the socket probably does not exist
  }
  socket.bind(config.socketPath)
  await chmod(config.socketPath, '662')
  log.info(`Metrics daemon listening on ${config.socketPath}`)
}

export const stop = async () => {
  socket.close()
  const bulk = getBulk()
  await bulk?.execute()
  if (config.observer.active) await stopObserver()
  await mongo.client.close()
}
