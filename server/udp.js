const config = require('config')
const dgram = require('dgram')
const { promisify } = require('util')
const eventToPromise = require('event-to-promise')
const equal = require('fast-deep-equal')
const dbUtils = require('./utils/db')
const session = require('./utils/session')
const prometheus = require('./utils/prometheus')

const debug = require('debug')('udp')

let bulk = []
let timeout
const processBulk = async (db) => {
  clearTimeout(timeout)
  timeout = setTimeout(() => processBulk(db), config.httpLogs.maxBulkDelay)
  const patches = []
  for (const line of bulk) {
    if (!line.operation.track) {
      debug('ignore operation without tracking category')
      continue
    }
    const day = line.date.slice(0, 10)
    const patchKey = {
      'owner.type': line.owner.type,
      'owner.id': line.owner.id,
      day,
      'resource.type': line.resource.type,
      'resource.id': line.resource.id,
      operationTrack: line.operation.track,
      statusClass: line.status.class,
      userClass: line.userClass,
      refererDomain: line.refererDomain,
      refererApp: line.refererApp
    }
    if (line.owner.department) {
      patchKey['owner.department'] = line.owner.department
    }
    const existingPatch = patches.find(p => equal(p[0], patchKey))
    if (existingPatch) {
      existingPatch[1].$inc.nbRequests += 1
      existingPatch[1].$inc.bytes += line.bytes
      existingPatch[1].$inc.duration += line.duration
    } else {
      patches.push([patchKey, {
        $set: {
          owner: line.owner,
          day,
          resource: line.resource,
          operationTrack: line.operation.track,
          statusClass: line.status.class,
          userClass: line.userClass,
          refererDomain: line.refererDomain,
          refererApp: line.refererApp
        },
        $inc: {
          nbRequests: 1,
          bytes: line.bytes,
          duration: line.duration
        }
      }])
    }
  }
  debug(`apply ${patches.length} patches based on ${bulk.length} http logs`)
  bulk = []
  if (patches.length) {
    const bulkOp = db.collection('daily-api-metrics').initializeUnorderedBulkOp()
    for (const patch of patches) {
      bulkOp.find(patch[0]).upsert().updateOne(patch[1])
    }
    await bulkOp.execute()
  }
}

// Run app and return it in a promise
let server, mongo
exports.run = async () => {
  if (!config.syslogSecret) throw new Error('syslog secret is missing from the configuration and required')
  mongo = await dbUtils.connect()
  await dbUtils.init(mongo.db)
  server = dgram.createSocket('udp4')
  server.on('message', async (msg) => {
    // remove syslog header
    msg = msg.toString().replace(/.* nginx: /, '')
    // check secret for minimal security
    if (!msg.startsWith(config.syslogSecret)) return console.error('message did not start with configured secret', msg)
    msg = msg.replace(config.syslogSecret, '')

    try {
      const body = JSON.parse(msg)
      debug('received log', msg)
      if (typeof body.resource === 'string') body.resource = JSON.parse(body.resource)
      if (body.resource && body.resource.title) body.resource.title = decodeURIComponent(body.resource.title)
      if (typeof body.status === 'string') body.status = JSON.parse(body.status)
      if (typeof body.status === 'number') body.status = { code: body.status }
      if (typeof body.operation === 'string') body.operation = JSON.parse(body.operation)
      if (typeof body.owner === 'string') body.owner = JSON.parse(body.owner)
      if (body.referer) {
        try {
          const url = new URL(body.referer)
          body.refererDomain = url.hostname
          if (url.pathname.startsWith('/data-fair/app/')) body.refererApp = url.pathname.replace('/data-fair/app/', '').split('/').shift()
          delete body.referer
        } catch (err) {
          body.refererDomain = body.referer
        }
      } else {
        body.refererDomain = 'none'
      }
      if (body.id_token && body.id_token.length > 1) {
        // TODO: only decode for performance ? memoize ?
        body.user = await session.verifyToken(body.id_token)
      }
      if (body.user && body.id_token_org) body.user.organization = body.user.organization = body.user.organizations.find(o => o.id === body.id_token_org)
      if (!body.user && body.apiKey) {
        const decoded = Buffer.from(body.apiKey, 'base64url').toString()
        const parts = decoded.split(':')
        if (parts.length === 3) {
          if (parts[0] === 'u') {
            body.user = { id: parts[1], name: 'API key', apiKey: true }
          }
          if (parts[0] === 'o') {
            body.user = { id: parts[2], name: 'API key', apiKey: true, organization: { id: parts[1] } }
          }
        }
      }
      if (!body.user) body.userClass = 'anonymous'
      else if (body.owner?.type === 'user' && body.user.id === body.owner?.id) body.userClass = 'owner'
      else if (body.owner?.type === 'organization' && body.user.organization?.id === body.owner?.id) body.userClass = 'owner'
      else body.userClass = 'external'

      if (body.user && body.user.apiKey) body.userClass += 'APIKey'

      if (body.status.code < 200) body.status.class = 'info'
      else if (body.status.code < 300) body.status.class = 'ok'
      else if (body.status.code < 400) body.status.class = 'redirect'
      else if (body.status.code < 500) body.status.class = 'clientError'
      else body.status.class = 'serverError'

      const promLabels = { cacheStatus: body.cacheStatus, operationId: body.operation.id, statusClass: body.status.class, host: body.host }
      prometheus.requests.labels(promLabels).observe(body.duration)
      prometheus.requestsBytes.labels(promLabels).inc(body.bytes)

      bulk.push(body)
    } catch (err) {
      console.error('failed to parse incoming log', err, msg)
    }
    if (bulk.length >= config.httpLogs.maxBulkSize) processBulk(mongo.db)
  })
  server.bind(config.udpPort)
  await eventToPromise(server, 'listening')
  timeout = setTimeout(() => processBulk(mongo.db), config.httpLogs.maxBulkDelay)
}

exports.stop = async () => {
  if (server) {
    server.close = promisify(server.close)
    await server.close()
  }
  if (mongo) {
    await processBulk(mongo.db)
    await mongo.client.close()
  }
}
