import type { LogLine, User as UserRef } from './types.ts'
import type { User } from '@data-fair/lib-express/session.js'

import { Counter, Histogram, Gauge } from 'prom-client'
import { servicePromRegistry } from '@data-fair/lib-node/observer.js'
import mongo from '#mongo'
import { getUserFromApiKey } from './user-from-api-key.ts'
import equal from 'fast-deep-equal'
import config from '#config'
import debug from 'debug'

const debugPatches = debug('patches')

const requestsHistogram = new Histogram({
  name: 'df_metrics_requests',
  help: 'Number and duration in seconds of HTTP requests',
  buckets: [0.05, 0.5, 2, 10, 60],
  labelNames: ['cacheStatus', 'operationId', 'statusClass', 'host']
})
const requestsBytesCounter = new Counter({
  name: 'df_metrics_requests_bytes',
  help: 'Total descending kilo-bytes of HTTP requests',
  labelNames: ['cacheStatus', 'operationId', 'statusClass', 'host']
})

// global metrics based on db connection
// eslint-disable-next-line no-new
new Gauge({
  name: 'df_metrics_daily_api_metrics_total',
  help: 'Total number of daily api metrics',
  registers: [servicePromRegistry],
  async collect () {
    this.set(await mongo.db.collection('daily-api-metrics').estimatedDocumentCount())
  }
})

const getStatusClass = (status: number) => {
  if (status < 200) return 'info'
  else if (status < 300) return 'ok'
  else if (status < 400) return 'redirect'
  else if (status < 500) return 'clientError'
  else return 'serverError'
}

const getUser = (line: LogLine) => {
  // identified user from the session cookie
  if (line[6] && line[6].length >= 2) {
    const user = JSON.parse(Buffer.from(line[6].split('.')[1], 'base64url').toString()) as User
    const userRef: UserRef = { id: user.id }
    if (line[7]) userRef.organization = user.organizations.find((o) => o.id === line[7])
    return userRef
  }
  // identified account from a self-describing api key (calls by api key carry no session cookie)
  if (line[8]) return getUserFromApiKey(line[8])
  return null
}

const getUserClass = (line: LogLine, user: UserRef | null, ownerType: string, ownerId: string) => {
  let userClass = ''
  if (!user) userClass = 'anonymous'
  else if (ownerType === 'user' && user.id === ownerId) userClass = 'owner'
  else if (ownerType === 'organization' && user.organization?.id === ownerId) userClass = 'owner'
  else userClass = 'external'

  if (user && line[8]) userClass += 'APIKey'
  return userClass
}

const getRefererInfo = (line: LogLine): [string, string | undefined] => {
  if (line[1]) {
    try {
      const url = new URL(line[1])
      let refererDomain = url.hostname
      let refererApp
      // referer given in query params is used to track original referer in the case of embedded pages
      // data-fair automatically adds this param to embed views and apps
      const searchParamReferer = url.searchParams.get('referer')
      if (searchParamReferer) refererDomain = searchParamReferer
      if (url.pathname.startsWith('/data-fair/app/')) refererApp = /** @type {string} */(url.pathname.replace('/data-fair/app/', '').split('/').shift())
      return [refererDomain, refererApp]
    } catch (err) {
      return [line[1], undefined]
    }
  } else {
    return ['none', undefined]
  }
}

// cf https://stackoverflow.com/a/14350155
// using regexp is faster and prevents lots of object affectations, garbage collecting, etc
const idPropRegexp = /"id":"((\\"|[^"])*)"/
const depPropRegexp = /"department":"((\\"|[^"])*)"/
const typePropRegexp = /"type":"((\\"|[^"])*)"/
const trackPropRegexp = /"track":"((\\"|[^"])*)"/

const patches: [Record<string, string>, any][] = []
let timeout: ReturnType<typeof setTimeout> | null = null

export function pushLogLine (line: LogLine) {
  const date = new Date()
  const day = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`

  // @test:spy("parsedLine", [day, line])

  // process/extract info from log line
  const operationId = line[13].match(idPropRegexp)?.[1]
  const operationTrack = line[13].match(trackPropRegexp)?.[1]
  const ownerType = line[5].match(typePropRegexp)?.[1]
  const ownerId = line[5].match(idPropRegexp)?.[1]
  const resourceType = line[12].match(typePropRegexp)?.[1]
  const resourceId = line[12].match(idPropRegexp)?.[1]
  if (!operationId || !operationTrack || !ownerType || !ownerId || !resourceType || !resourceId) return
  const ownerDep = line[1].match(depPropRegexp)?.[1]
  const statusClass = getStatusClass(line[4])
  const user = getUser(line)
  const userClass = getUserClass(line, user, ownerType, ownerId)
  const [refererDomain, refererApp] = getRefererInfo(line)

  let bytesSent = line[3]
  if (line[14] && line[14] !== '-') {
    const gzipRatio = Number(line[14])
    if (!isNaN(gzipRatio)) bytesSent *= gzipRatio
  }

  // increment prometheus metrics
  requestsHistogram.labels(line[11], operationId, statusClass, line[0]).observe(line[2])
  requestsBytesCounter.labels(line[11], operationId, statusClass, line[0]).inc(bytesSent)

  // manage mongo patches
  const patchKey: Record<string, string> = {
    'owner.type': ownerType,
    'owner.id': ownerId,
    day,
    'resource.type': resourceType,
    'resource.id': resourceId,
    operationTrack,
    statusClass,
    userClass,
    refererDomain
  }
  if (refererApp) patchKey.refererApp = refererApp
  if (ownerDep) patchKey['owner.department'] = ownerDep

  const existingPatch = patches.find(p => equal(p[0], patchKey))
  if (existingPatch) {
    existingPatch[1].$inc.nbRequests += 1
    existingPatch[1].$inc.bytes += bytesSent
    existingPatch[1].$inc.duration += line[2]
  } else {
    const resource = JSON.parse(line[12])
    if (resource.title) resource.title = decodeURIComponent(resource.title)

    const set: Record<string, any> = {
      owner: JSON.parse(line[5]),
      day,
      resource,
      operationTrack,
      statusClass,
      userClass,
      refererDomain
    }
    if (refererApp) set.refererApp = refererApp

    patches.push([patchKey, {
      $set: set,
      $inc: {
        nbRequests: 1,
        bytes: bytesSent,
        duration: line[2]
      }
    }])
  }

  if (patches.length >= config.maxBulkSize) {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
    const bulk = getBulk()
    bulk?.execute().then(() => {
      // @test:spy("sentBulkMaxSize", bulk.batches.length)
    })
  } else if (!timeout) {
    timeout = setTimeout(async () => {
      timeout = null
      const bulk = getBulk()
      bulk?.execute().then(() => {
        // @test:spy("sentBulkDelay", bulk.batches.length)
      })
    }, config.maxDelayMS)
  }
}

export function getBulk () {
  if (!patches.length) return null
  debugPatches('send bulk patches', patches.length)
  const bulk = mongo.db.collection('daily-api-metrics').initializeUnorderedBulkOp()
  for (const [patchKey, patch] of patches) {
    bulk.find(patchKey).upsert().updateOne(patch)
  }
  patches.length = 0
  return bulk
}
