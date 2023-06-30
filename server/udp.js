const config = require('config')
const dgram = require('dgram')
const { promisify } = require('util')
const eventToPromise = require('event-to-promise')
const equal = require('fast-deep-equal')
const dbUtils = require('./utils/db')
const prometheus = require('./utils/prometheus')

const debug = require('debug')('udp')

let bulk = []
let timeout
const processBulk = async (db) => {
  clearTimeout(timeout)
  timeout = setTimeout(() => processBulk(db), config.httpLogs.maxBulkDelay)
  const patches = []
  for (const line of bulk) {
    if (!line.op.track) {
      debug('ignore operation without tracking category')
      continue
    }
    if (line.refererDomain === 'http-req-exporter') {
      debug('ignore request triggered by promtheus exporter')
      continue
    }
    const day = line.date.slice(0, 10)
    const patchKey = {
      'owner.type': line.o.type,
      'owner.id': line.o.id,
      day,
      'resource.type': line.rs.type,
      'resource.id': line.rs.id,
      operationTrack: line.op.track,
      statusClass: line.s.class,
      userClass: line.userClass,
      refererDomain: line.refererDomain,
      refererApp: line.refererApp
    }
    if (line.o.department) {
      patchKey['owner.department'] = line.o.department
    }
    if (line.p) {
      patchKey['processing._id'] = line.p._id
    }
    const existingPatch = patches.find(p => equal(p[0], patchKey))
    if (existingPatch) {
      existingPatch[1].$inc.nbRequests += 1
      existingPatch[1].$inc.bytes += line.b
      existingPatch[1].$inc.duration += line.t
    } else {
      patches.push([patchKey, {
        $set: {
          owner: line.o,
          day,
          resource: line.rs,
          operationTrack: line.op.track,
          statusClass: line.s.class,
          userClass: line.userClass,
          refererDomain: line.refererDomain,
          refererApp: line.refererApp,
          processing: line.p
        },
        $inc: {
          nbRequests: 1,
          bytes: line.b,
          duration: line.t
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

// use shorter keys for lighter logs but also accept older longer keys for retro-compatibility
// TODO: remove this mapping once transition is completed
const shortKeys = [
  ['duration', 't'],
  ['resource', 'rs'],
  ['status', 's'],
  ['owner', 'o'],
  ['host', 'h'],
  ['id_token', 'i'],
  ['id_token_org', 'io'],
  ['apiKey', 'ak'],
  ['account', 'a'],
  ['processing', 'p'],
  ['cacheStatus', 'c'],
  ['operation', 'op'],
  ['referer', 'r'],
  ['bytes', 'b']
]

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

      for (const keyPair of shortKeys) {
        if (keyPair[0] in body) body[keyPair[1]] = body[keyPair[0]]
      }

      body.date = new Date().toISOString()

      if (body.rs && typeof body.rs === 'string') body.rs = JSON.parse(body.rs)
      if (body.rs && body.rs.title) body.rs.title = decodeURIComponent(body.rs.title)
      if (body.s && typeof body.s === 'string') body.s = JSON.parse(body.s)
      if (typeof body.s === 'number') body.s = { code: body.s }
      if (body.op && typeof body.op === 'string') body.op = JSON.parse(body.op)
      if (body.o && typeof body.o === 'string') body.o = JSON.parse(body.o)
      if (body.a && typeof body.a === 'string') body.a = JSON.parse(body.a)
      if (body.p && typeof body.p === 'string') body.p = JSON.parse(body.p)
      if (body.p && body.p.title) body.p.title = decodeURIComponent(body.p.title)
      if (body.r) {
        try {
          const url = new URL(body.r)
          body.refererDomain = url.hostname
          // referer given in query params is used to track original referer in the case of embedded pages
          // data-fair automatically adds this param to embed views and apps
          if (url.searchParams.get('referer')) body.refererDomain = url.searchParams.get('referer')
          if (url.pathname.startsWith('/data-fair/app/')) body.refererApp = url.pathname.replace('/data-fair/app/', '').split('/').shift()
          delete body.r
        } catch (err) {
          body.refererDomain = body.r
        }
      } else {
        body.refererDomain = 'none'
      }
      if (body.i && body.i.length > 1) {
        body.user = JSON.parse(Buffer.from(body.i.split('.')[1], 'base64url').toString())
      }
      if (body.user && body.io) body.user.organization = body.user.organization = body.user.organizations.find(o => o.id === body.io)
      if (!body.user && body.ak) {
        const decoded = Buffer.from(body.ak, 'base64url').toString()
        const parts = decoded.split(':')
        if (parts.length >= 3) {
          if (parts[0] === 'u') {
            body.user = { id: parts[1], name: 'API key', apiKey: true }
          }
          if (parts[0] === 'o') {
            if (parts.lenghth === 4) {
              body.user = { id: parts[3], name: 'API key', apiKey: true, organization: { id: parts[1], department: parts[2] } }
            } else {
              body.user = { id: parts[2], name: 'API key', apiKey: true, organization: { id: parts[1] } }
            }
          }
        }
      }
      if (body.p && body.a) {
        if (body.a.type === 'user') {
          body.user = { id: body.a.id, name: 'Processing', processing: true }
        } else {
          body.user = { id: body.p._id, name: 'Processing', processing: true, organization: { id: body.a.id } }
        }
        body.p.title += ` (${body.a.name})`
      }
      if (!body.user) body.userClass = 'anonymous'
      else if (body.o?.type === 'user' && body.user.id === body.o?.id) body.userClass = 'owner'
      else if (body.o?.type === 'organization' && body.user.organization?.id === body.o?.id) body.userClass = 'owner'
      else body.userClass = 'external'

      if (body.user && body.user.apiKey) body.userClass += 'APIKey'
      if (body.user && body.user.processing) body.userClass += 'Processing'

      if (body.s.code < 200) body.s.class = 'info'
      else if (body.s.code < 300) body.s.class = 'ok'
      else if (body.s.code < 400) body.s.class = 'redirect'
      else if (body.s.code < 500) body.s.class = 'clientError'
      else body.s.class = 'serverError'

      const promLabels = { cacheStatus: body.c, operationId: body.op.id, statusClass: body.s.class, host: body.h }
      prometheus.requests.labels(promLabels).observe(body.t)
      prometheus.requestsBytes.labels(promLabels).inc(body.b)

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
