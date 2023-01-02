const debug = require('debug')('db')
const config = require('config')
const { MongoClient } = require('mongodb')

exports.ensureIndex = async (db, collection, key, options = {}) => {
  try {
    await db.collection(collection).createIndex(key, options)
  } catch (err) {
    if ((err.code !== 85 && err.code !== 86) || !options.name) throw err

    // if the error is a conflict on keys or params of the index we automatically
    // delete then recreate the index
    console.log(`Drop then recreate index ${collection}/${options.name}`)
    await db.collection(collection).dropIndex(options.name)
    await db.collection(collection).createIndex(key, options)
  }
}

exports.connect = async () => {
  const opts = {
    maxPoolSize: config.mode === 'udp' ? 1 : 5
  }
  debug('Connecting to mongodb ' + config.mongoUrl)
  const client = await MongoClient.connect(config.mongoUrl, opts)
  const db = client.db()
  return { db, client }
}

exports.init = async (db) => {
  const promises = [
    exports.ensureIndex(db, 'daily-api-metrics', {
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
      refererTrack: 1,
      'processing._id': 1
    }, { name: 'main-keys', unique: true })
  ]
  await Promise.all(promises)
}
