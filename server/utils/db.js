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
  let client
  const opts = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // workers generate a lot of opened sockets if we do not change this setting
    poolSize: config.mode === 'task' ? 1 : 5
  }
  debug('Connecting to mongodb ' + config.mongoUrl)
  try {
    client = await MongoClient.connect(config.mongoUrl, opts)
  } catch (err) {
    // 1 retry after 1s
    // solve the quite common case in docker-compose of the service starting at the same time as the db
    await new Promise(resolve => setTimeout(resolve, 1000))
    client = await MongoClient.connect(config.mongoUrl, opts)
  }
  const db = client.db()
  return { db, client }
}

exports.init = async (db) => {
  const promises = [
    exports.ensureIndex(db, 'daily-api-metrics', {
      'owner.type': 1,
      'owner.id': 1,
      day: 1,
      'resource.type': 1,
      'resource.id': 1,
      'operation.class': 1,
      'operation.id': 1,
      'status.code': 1,
      refererDomain: 1
    }, { name: 'main-keys' })
  ]
  await Promise.all(promises)
}
