import Debug from 'debug'
import config from './config'
import { MongoClient, MongoError, type Db } from 'mongodb'

const debug = Debug('db')

const ensureIndex = async (db: Db, collection: string, key: any, options: any = {}) => {
  try {
    await db.collection(collection).createIndex(key, options)
  } catch (err) {
    if (options.name && err instanceof MongoError && (err.code === 85 || err.code === 86)) {
    // if the error is a conflict on keys or params of the index we automatically
    // delete then recreate the index
      console.log(`Drop then recreate index ${collection}/${options.name}`)
      await db.collection(collection).dropIndex(options.name)
      await db.collection(collection).createIndex(key, options)
    } else {
      throw err
    }
  }
}

// storing state inside the module is not a great pattern
// but I am tired of moving db along in all method signatures
let _client: MongoClient
let _db: Db

export const connect = async () => {
  const opts = { maxPoolSize: 5 }
  debug('Connecting to mongodb ' + config.mongoUrl)
  const client = await MongoClient.connect(config.mongoUrl, opts)
  const db = client.db()

  await ensureIndex(db, 'daily-api-metrics', {
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
  }, { name: 'main-keys', unique: true })
  _db = db
  _client = client
}

export const db = () => {
  return _db
}
export const client = () => {
  return _client
}
