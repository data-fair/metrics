const config = require('config')
const dgram = require('dgram')
const { promisify } = require('util')
const eventToPromise = require('event-to-promise')
const equal = require('fast-deep-equal')
const dbUtils = require('./utils/db')

const maxBulkSize = 50
const maxBulkDelay = 10000

let bulk = []
let timeout
const processBulk = async (db) => {
  clearTimeout(timeout)
  timeout = setTimeout(() => processBulk(db), maxBulkDelay)
  const patches = []
  for (const line of bulk) {
    const day = line.date.slice(0, 10)
    const patchKey = {
      'owner.type': line.owner.type,
      'owner.id': line.owner.id,
      day,
      'resource.type': line.resource.type,
      'resource.id': line.resource.id,
      'operation.class': line.operation.class,
      'operation.id': line.operation.id,
      'status.code': line.status.code,
      refererDomain: line.refererDomain
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
          operation: line.operation,
          status: line.status,
          refererDomain: line.refererDomain
        },
        $inc: {
          nbRequests: 1,
          bytes: line.bytes,
          duration: line.duration
        }
      }
      ])
    }
  }
  console.log(`apply ${patches.length} patches based on ${bulk.length} http logs`)
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
  mongo = await dbUtils.connect()
  await dbUtils.init(mongo.db)
  server = dgram.createSocket('udp4')
  server.on('message', (msg) => {
    const body = JSON.parse(msg.toString().replace(/.* nginx: /, ''))
    if (body.referer) {
      body.refererDomain = new URL(body.referer).hostname
      delete body.referer
    }
    if (body.status && !body.status.class) {
      if (body.status.code < 200) body.status.class = 'info'
      else if (body.status.code < 300) body.status.class = 'ok'
      else if (body.status.code < 400) body.status.class = 'redirect'
      else if (body.status.code < 500) body.status.class = 'clientError'
      else body.status.class = 'serverError'
    }
    bulk.push(body)
    if (bulk.length >= maxBulkSize) processBulk(mongo.db)
  })
  server.bind(config.udpPort)
  await eventToPromise(server, 'listening')
  timeout = setTimeout(() => processBulk(mongo.db), maxBulkDelay)
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
