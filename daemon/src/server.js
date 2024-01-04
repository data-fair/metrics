import { unlink, chmod } from 'node:fs/promises'
import config from './config.js'
// @ts-ignore
import unixDgram from 'unix-dgram'
import mongo from '@data-fair/lib/node/mongo.js'
import * as prometheus from '@data-fair/lib/node/prometheus.js'
import { pushLogLine, getBulk } from './service.js'

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

/**
 * @param {string} logLine
 * @returns {import('./types.js').LogLine}
 */
export const parseLogLine = (logLine) => {
  // @test:spy("rawLine", logLine)
  const match = logLine.match(logLineRegexp)
  if (!match) throw new Error('regexp dit not match')
  return JSON.parse(match[1])
}

const socket = unixDgram.createSocket('unix_dgram', (/** @type {Buffer} */data) => {
  try {
    pushLogLine(parseLogLine(data.toString()))
  } catch (err) {
    console.error('Could not parse log line', err)
  }
})

export const start = async () => {
  if (config.prometheus.active) await prometheus.start()
  await mongo.connect(config.mongoUrl)

  await mongo.configure({
    'daily-api-metrics': {
      'main-keys': [
        {
          'owner.type': 1,
          'owner.id': 1,
          'owner.department': 1,
          day: 1,
          'resource.type': 1,
          'resource.id': 1,
          operationTrack: 1,
          statusClass: 1,
          userClass: 1,
          refererDomain: 1,
          refererApp: 1,
          'processing._id': 1
        },
        { unique: true }
      ]
    }
  })

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
  await mongo.client.close()
}
