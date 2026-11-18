// Pure functions of the daemon: from an access log line to the key and the increments of a daily metric.
// No socket, no mongo, no prometheus here, so the unit tests import them without side effects.
import type { LogLine, User as UserRef } from './types.ts'
import type { User } from '@data-fair/lib-express/session.js'
import { getUserFromApiKey } from './user-from-api-key.ts'

// inspired by https://github.com/vadimdemedes/syslog-parse/blob/master/source/index.ts
// but lighter and only capturing the message (the syslog prefix ends with the "df:" tag)
const logLineRegexp = /.*? df: (.*)/

export const parseLogLine = (logLine: string) => {
  const match = logLine.match(logLineRegexp)
  if (!match) throw new Error('regexp did not match')
  return JSON.parse(match[1]) as LogLine
}

export const getStatusClass = (status: number) => {
  if (status < 200) return 'info'
  else if (status < 300) return 'ok'
  else if (status < 400) return 'redirect'
  else if (status < 500) return 'clientError'
  else return 'serverError'
}

export const getUser = (line: LogLine): UserRef | null => {
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

export const getUserClass = (line: LogLine, user: UserRef | null, ownerType: string, ownerId: string) => {
  let userClass = ''
  if (!user) userClass = 'anonymous'
  else if (ownerType === 'user' && user.id === ownerId) userClass = 'owner'
  else if (ownerType === 'organization' && user.organization?.id === ownerId) userClass = 'owner'
  else userClass = 'external'

  if (user && line[8]) userClass += 'APIKey'
  return userClass
}

export type RefererCategory = 'backoffice' | 'embed' | 'app' | 'mcp' | 'other'

// classifies internal traffic by path; a referer whose host doesn't match our
// own host can't be trusted to be internal, no matter what its path looks like
export const getRefererCategory = (url: URL, host: string): RefererCategory => {
  if (url.hostname !== host) return 'other'
  if (url.pathname.startsWith('/mcp')) return 'mcp'
  if (url.pathname.startsWith('/data-fair/embed')) return 'embed'
  if (url.pathname.startsWith('/data-fair/app/')) return 'app'
  if (url.pathname.startsWith('/data-fair/')) return 'backoffice'
  return 'other'
}

export const getRefererInfo = (line: LogLine): [string, string | undefined, RefererCategory] => {
  if (!line[1]) return ['none', undefined, 'other']
  try {
    const url = new URL(line[1])
    let refererDomain = url.hostname
    let refererApp
    // referer given in query params is used to track original referer in the case of embedded pages
    // data-fair automatically adds this param to embed views and apps
    const searchParamReferer = url.searchParams.get('referer')
    if (searchParamReferer) refererDomain = searchParamReferer
    if (url.pathname.startsWith('/data-fair/app/')) refererApp = url.pathname.replace('/data-fair/app/', '').split('/').shift()
    return [refererDomain, refererApp, getRefererCategory(url, line[0])]
  } catch (err) {
    return [line[1], undefined, 'other']
  }
}

// cf https://stackoverflow.com/a/14350155
// using regexp is faster and prevents lots of object affectations, garbage collecting, etc
const idPropRegexp = /"id":"((\\"|[^"])*)"/
const depPropRegexp = /"department":"((\\"|[^"])*)"/
const typePropRegexp = /"type":"((\\"|[^"])*)"/
const trackPropRegexp = /"track":"((\\"|[^"])*)"/

export type PatchKey = Record<string, string>

export type LineMetric = {
  operationId: string
  statusClass: string
  // the filter of the daily metric's upsert
  patchKey: PatchKey
  // the fields of a new daily metric
  set: () => Record<string, any>
  nbRequests: 1
  bytes: number
  duration: number
}

const day = (date: Date) => `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`

/** The daily metric a log line increments, or null when the line does not describe a tracked operation. */
export const lineMetric = (line: LogLine, date = new Date()): LineMetric | null => {
  const operationId = line[13].match(idPropRegexp)?.[1]
  const operationTrack = line[13].match(trackPropRegexp)?.[1]
  const ownerType = line[5].match(typePropRegexp)?.[1]
  const ownerId = line[5].match(idPropRegexp)?.[1]
  const resourceType = line[12].match(typePropRegexp)?.[1]
  const resourceId = line[12].match(idPropRegexp)?.[1]
  if (!operationId || !operationTrack || !ownerType || !ownerId || !resourceType || !resourceId) return null
  const ownerDep = line[5].match(depPropRegexp)?.[1]
  const statusClass = getStatusClass(line[4])
  const userClass = getUserClass(line, getUser(line), ownerType, ownerId)
  const [refererDomain, refererApp, refererCategory] = getRefererInfo(line)

  let bytes = line[3]
  if (line[14] && line[14] !== '-') {
    const gzipRatio = Number(line[14])
    if (!isNaN(gzipRatio)) bytes *= gzipRatio
  }

  const patchKey: PatchKey = {
    'owner.type': ownerType,
    'owner.id': ownerId,
    day: day(date),
    'resource.type': resourceType,
    'resource.id': resourceId,
    operationTrack,
    statusClass,
    userClass,
    refererDomain,
    refererCategory
  }
  if (refererApp) patchKey.refererApp = refererApp
  if (ownerDep) patchKey['owner.department'] = ownerDep

  const set = () => {
    const resource = JSON.parse(line[12])
    if (resource.title) resource.title = decodeURIComponent(resource.title)
    const fields: Record<string, any> = {
      owner: JSON.parse(line[5]),
      day: patchKey.day,
      resource,
      operationTrack,
      statusClass,
      userClass,
      refererDomain,
      refererCategory
    }
    if (refererApp) fields.refererApp = refererApp
    return fields
  }

  return { operationId, statusClass, patchKey, set, nbRequests: 1, bytes, duration: line[2] }
}
