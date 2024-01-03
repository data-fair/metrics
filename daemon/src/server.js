import { unlink } from 'node:fs/promises'
import config from './config.js'
import { DgramSocket } from 'node-unix-socket'
import mongo from '@data-fair/lib/node/mongo.js'
import * as prometheus from '@data-fair/lib/node/prometheus.js'
import { pushLogLine, getBulk } from './service.js'

// inspired by https://github.com/vadimdemedes/syslog-parse/blob/master/source/index.ts
// but lighter and only capturing the fields we need

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthsIso = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
const logLineRegexp = new RegExp([
  '(?:<[0-9]+>)?', // optional priority (not captured)
  '([a-zA-Z]{3})\\s+', // month,
  '([0-9]{1,2})\\s+', // day
  '(?:[0-9]{2}):', // hours (not captured)
  '(?:[0-9]{2}):', // minutes (not captured)
  '(?:[0-9]{2})\\s+', // seconds (not captured)
  '(?:.*?):', // host, process, pid (not captured)
  '(.*)' // message
].join(''))

/**
 * @param {string} logLine
 * @returns {[string, import('./types.js').LogLine]}
 */
export const parseLogLine = (logLine) => {
  // @test:spy("parseLogLine", logLine)
  const match = logLine.match(logLineRegexp)
  if (!match) throw new Error('regexp dit not match')
  const day = `${new Date().getUTCFullYear()}-${monthsIso[months.indexOf(match[1])]}-${match[2].length === 1 ? '0' : ''}${match[2]}`
  return [day, JSON.parse(match[3])]
}

const socket = new DgramSocket()
export const start = async () => {
  if (config.prometheus.active) await prometheus.start()
  await mongo.connect(config.mongoUrl)

  try {
    await unlink(config.socketPath)
  } catch (err) {
    // nothing to do, the socket probably does not exist
  }
  socket.bind(config.socketPath)

  socket.on('data', (data) => {
    console.log('DATA', data)
    try {
      const [date, line] = parseLogLine(data.toString())
      pushLogLine(date, line)
    } catch (err) {
      console.error('Could not parse log line', err)
    }
  })
  console.log(`Metrics daemon listening on ${config.socketPath}`)
}

export const stop = async () => {
  socket.close()
  const bulk = getBulk()
  await bulk?.execute()
  await mongo.client.close()
}
