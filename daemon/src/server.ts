import type { LogLine } from './types.ts'

import { unlink, chmod } from 'node:fs/promises'
import config from '#config'
// @ts-ignore
import unixDgram from 'unix-dgram'
import mongo from '#mongo'
import { startObserver, stopObserver, internalError } from '@data-fair/lib-node/observer.js'
import { pushLogLine, getBulk } from './service.ts'

// inspired by https://github.com/vadimdemedes/syslog-parse/blob/master/source/index.ts
// but lighter and only capturing the message we need
/* const logLineRegexp = new RegExp([
  '(?:<[0-9]+>)?', // optional priority (not captured)
  '(?:[a-zA-Z]{3})\\s+', // month (not captured),
  '(?:[0-9]{1,2})\\s+', // day (not captured)
  '(?:[0-9]{2}):', // hours (not captured)
  '(?:[0-9]{2}):', // minutes (not captured)
  '(?:[0-9]{2})\\s+', // seconds (not captured)
  '(?:.*?):', // host, process, pid (not captured)
  '(.*)' // message
].join('')) */
const logLineRegexp = /.*? df: (.*)/

export const parseLogLine = (logLine: string) => {
  // @test:spy("rawLine", logLine)
  const match = logLine.match(logLineRegexp)
  if (!match) throw new Error('regexp dit not match')
  return JSON.parse(match[1]) as LogLine
}

const socket = unixDgram.createSocket('unix_dgram', (data: Buffer) => {
  try {
    pushLogLine(parseLogLine(data.toString()))
  } catch (err) {
    console.error('Could not parse log line', err, data.toString())
    internalError('log-parse', 'could not parse log line', err, data.toString())
  }
})

export const start = async () => {
  if (config.observer.active) await startObserver()
  await mongo.init()

  console.log(`attempt to bind to socket ${config.socketPath}`)
  try {
    await unlink(config.socketPath)
  } catch (err) {
    // nothing to do, the socket probably does not exist
  }
  socket.bind(config.socketPath)
  await chmod(config.socketPath, '662')
  console.log(`Metrics daemon listening on ${config.socketPath}`)
}

export const stop = async () => {
  socket.close()
  const bulk = getBulk()
  await bulk?.execute()
  if (config.observer.active) await stopObserver()
  await mongo.client.close()
}
