import { Counter, Histogram, Gauge } from 'prom-client'
import { globalRegistry } from '@data-fair/lib/node/prometheus.js'
import mongo from '@data-fair/lib/node/mongo.js'
import equal from 'fast-deep-equal'

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
  registers: [globalRegistry],
  async collect () {
    this.set(await mongo.db.collection('daily-api-metrics').estimatedDocumentCount())
  }
})

const getStatusClass = (/** @type {number} */status) => {
  if (status < 200) return 'info'
  else if (status < 300) return 'ok'
  else if (status < 400) return 'redirect'
  else if (status < 500) return 'clientError'
  else return 'serverError'
}

/**
 * @param {import("./types.js").LogLine} line
 * @returns {import("./types.js").User | null}
 */
const getUser = (line) => {
  if (!line[6] || line[6].length < 2) return null
  const user = JSON.parse(Buffer.from(line[6].split('.')[1], 'base64url').toString())
  if (line[7]) user.organization = user.organizations.find((/** @type {any} */o) => o.id === line[7])
  return user
}

/**
 * @param {import("./types.js").LogLine} line
 * @param {import("./types.js").User | null} user
 * @param {string} ownerType
 * @param {string} ownerId
 * @returns {string}
 */
const getUserClass = (line, user, ownerType, ownerId) => {
  let userClass = ''
  if (!user) userClass = 'anonymous'
  else if (ownerType === 'user' && user.id === ownerId) userClass = 'owner'
  else if (ownerType === 'organization' && user.organization?.id === ownerId) userClass = 'owner'
  else userClass = 'external'

  if (user && line[8]) userClass += 'APIKey'
  if (user && line[10]) userClass += 'Processing'
  return userClass
}

/**
 * @param {import("./types.js").LogLine} line
 * @returns {[string, string | undefined]}
 */
const getRefererInfo = (line) => {
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
const _idPropRegexp = /"_id":"((\\"|[^"])*)"/
const depPropRegexp = /"department":"((\\"|[^"])*)"/
const typePropRegexp = /"type":"((\\"|[^"])*)"/
const trackPropRegexp = /"track":"((\\"|[^"])*)"/

/** @type {[Record<string, string>, any][]} */
const patches = []
let lastApply = Date.now()

/**
 * @param {string} day
 * @param {import("./types.js").LogLine} line
 */
export async function pushLogLine (day, line) {
  // process/extract info from log line
  const operationId = line[13].match(idPropRegexp)?.[1]
  const operationTrack = line[13].match(trackPropRegexp)?.[1]
  const ownerType = line[5].match(typePropRegexp)?.[1]
  const ownerId = line[5].match(idPropRegexp)?.[1]
  const resourceType = line[12].match(typePropRegexp)?.[1]
  const resourceId = line[12].match(idPropRegexp)?.[1]
  if (!operationId || !operationTrack || !ownerType || !ownerId || !resourceType || !resourceId) return
  const ownerDep = line[1].match(depPropRegexp)?.[1]
  const processingId = line[10].match(_idPropRegexp)?.[1]
  const statusClass = getStatusClass(line[4])
  const user = getUser(line)
  const userClass = getUserClass(line, user, ownerType, ownerId)
  const [refererDomain, refererApp] = getRefererInfo(line)

  // increment prometheus metrics
  requestsHistogram.labels(line[11], operationId, statusClass, line[0]).observe(line[2])
  requestsBytesCounter.labels(line[11], operationId, statusClass, line[0]).inc(line[3])

  // manage mongo patches
  /** @type {Record<string, string>} */
  const patchKey = {
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
  if (processingId) patchKey['processing._id'] = processingId

  const existingPatch = patches.find(p => equal(p[0], patchKey))
  if (existingPatch) {
    existingPatch[1].$inc.nbRequests += 1
    existingPatch[1].$inc.bytes += line[3]
    existingPatch[1].$inc.duration += line[2]
  } else {
    patches.push([patchKey, {
      $set: {
        owner: JSON.parse(line[5]),
        day,
        resource: JSON.parse(line[12]),
        operationTrack,
        statusClass,
        userClass,
        refererDomain,
        refererApp,
        processing: JSON.parse(line[10])
      },
      $inc: {
        nbRequests: 1,
        bytes: line[3],
        duration: line[2]
      }
    }])
  }

  const now = Date.now()
  if (patches.length >= 1000 || now - lastApply > 10000) {
    lastApply = now
    const bulk = getBulk()
    await bulk?.execute()
  }
}

export function getBulk () {
  if (!patches.length) return null
  const bulk = mongo.db.collection('daily-api-metrics').initializeUnorderedBulkOp()
  for (const [patchKey, patch] of patches) {
    bulk.find(patchKey).upsert().updateOne(patch)
  }
  patches.length = 0
  return bulk
}
