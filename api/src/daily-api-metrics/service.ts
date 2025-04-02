import type { Account } from '@data-fair/lib-express/session.js'
import type { DailyApiMetric } from '#types'
import type { AggQuery, AggResult } from '#doc'

import { camelCase } from 'camel-case'
import dayjs from 'dayjs'
import dayjsUtc from 'dayjs/plugin/utc.js'
import mongo from '#mongo'
import equal from 'fast-deep-equal'

dayjs.extend(dayjsUtc)

export const list = async (account: Account) => {
  const query: Record<string, string> = {
    'owner.type': account.type,
    'owner.id': account.id
  }
  if (account.department) {
    query['owner.department'] = account.department
  }
  const results = (await mongo.dailyApiMetrics
    .find(query)
    .sort({ day: 1 })
    .limit(10000)
    .toArray()) as DailyApiMetric[]
  return results
}

export const agg = async (account: Account, query: AggQuery) => {
  const $match: Record<string, any> = {
    'owner.type': account.type,
    'owner.id': account.id
  }
  if (account.department) {
    $match['owner.department'] = account.department
  }

  if (query.start) $match.day = { $gte: query.start }
  if (query.end) $match.day = { ...$match.day, $lte: query.end }
  if (query.statusClass) $match.statusClass = query.statusClass
  if (query.userClass) $match.userClass = query.userClass
  if (query.operationTrack) $match.operationTrack = query.operationTrack
  if (query.resourceType) $match['resource.type'] = query.resourceType
  if (query.resourceId) $match['resource.id'] = query.resourceId
  if (query.processingId) $match['processing._id'] = query.resourceId

  const $group: Record<string, any> = {
    _id: {},
    count: { $sum: 1 },
    nbRequests: { $sum: '$nbRequests' },
    bytes: { $sum: '$bytes' },
    duration: { $sum: '$duration' }
  }

  const seriesKey = []
  const split = query.split ?? ['day']
  for (const part of split) {
    // TODO: always require the split property ?
    if (part === 'refererApp') {
      $match.refererApp = { $ne: null }
    }
    if (part === 'processing') {
      $match['processing._id'] = { $ne: null }
      $group._id.processingId = '$processing._id'
      $group.processing = { $last: '$processing' }
    } else if (part === 'resource') {
      $group._id.resourceType = '$resource.type'
      $group._id.resourceId = '$resource.id'
      $group.resource = { $last: '$resource' }
    } else {
      if (part !== 'day') seriesKey.push(camelCase(part))
      $group._id[camelCase(part)] = '$' + part
    }
  }

  const pipeline = [
    { $match },
    { $group },
    { $sort: { '_id.day': 1 } }
  ]
  const aggResult = await mongo.dailyApiMetrics.aggregate(pipeline).toArray()
  const items = aggResult.map((r) => ({ ...r._id, ...r, meanDuration: r.duration / r.nbRequests }))
  const result: AggResult = {
    series: [],
    nbRequests: 0,
    bytes: 0
  }
  if (split[0] === 'day') {
    result.days = []
    if (items.length) {
      const start = query.start || items[0].day
      const end = query.end || items[items.length - 1].day
      let current = dayjs.utc(start)
      while (current.toISOString().slice(0, 10) <= end) {
        const day = current.toISOString().slice(0, 10)
        if (!result.days.includes(day)) result.days.push(day)
        current = current.add(1, 'days')
      }
    }
  }
  for (const item of items) {
    const key = seriesKey.reduce((a, key) => { a[key] = item[key]; return a }, {} as Record<string, string>)
    if (item.resource) key.resource = item.resource
    if (item.processing) key.processing = item.processing
    let serie = result.series.find((s) => equal(s.key, key))
    if (!serie) {
      serie = {
        key,
        nbRequests: 0,
        bytes: 0
      }
      result.series.push(serie)
    }
    serie.nbRequests += item.nbRequests
    serie.bytes += item.bytes
    result.nbRequests += item.nbRequests
    result.bytes += item.bytes
    if (split[0] === 'day') {
      serie.days = serie.days ?? {}
      serie.days[item.day] = { nbRequests: item.nbRequests, bytes: item.bytes, meanDuration: item.meanDuration }
    }
  }
  result.series.sort((s1, s2) => s2.nbRequests - s1.nbRequests)
  return result
}

export const getHistory = async (account: Account, query: { start: string, end: string }) => {
  const $match: Record<string, any> = {
    'owner.type': account.type,
    'owner.id': account.id,
    statusClass: 'ok',
    day: {
      $gte: query.start,
      $lte: query.end
    },
    operationTrack: { $in: ['readDataAPI', 'readDataFiles'] }
  }
  if (account.department) $match['owner.department'] = account.department

  const aggregate = [
    { $match },
    {
      $group: {
        _id: {
          day: '$day',
          userClass: '$userClass'
        },
        nbRequests: { $sum: { $cond: [{ $eq: ['$operationTrack', 'readDataAPI'] }, '$nbRequests', 0] } },
        nbFiles: { $sum: { $cond: [{ $eq: ['$operationTrack', 'readDataFiles'] }, '$nbRequests', 0] } }
      }
    },
    {
      $group: {
        _id: '$_id.day',
        nbRequests: { $sum: '$nbRequests' },
        nbFiles: { $sum: '$nbFiles' },
        nbRequestsAnonymous: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'anonymous'] }, '$nbRequests', 0] } },
        nbRequestsOwner: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'owner'] }, '$nbRequests', 0] } },
        nbRequestsUser: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'user'] }, '$nbRequests', 0] } },
        nbRequestsExternal: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'external'] }, '$nbRequests', 0] } },
        nbRequestsOwnerAPIKey: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'ownerAPIKey'] }, '$nbRequests', 0] } },
        nbRequestsExternalAPIKey: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'externalAPIKey'] }, '$nbRequests', 0] } },
        nbFilesAnonymous: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'anonymous'] }, '$nbFiles', 0] } },
        nbFilesOwner: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'owner'] }, '$nbFiles', 0] } },
        nbFilesUser: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'user'] }, '$nbFiles', 0] } },
        nbFilesExternal: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'external'] }, '$nbFiles', 0] } }
      }
    },
    {
      $project: {
        _id: 0,
        day: '$_id',
        nbRequests: 1,
        nbFiles: 1,
        nbRequestsAnonymous: 1,
        nbRequestsOwner: 1,
        nbRequestsUser: 1,
        nbRequestsExternal: 1,
        nbRequestsOwnerAPIKey: 1,
        nbRequestsExternalAPIKey: 1,
        nbFilesAnonymous: 1,
        nbFilesOwner: 1,
        nbFilesUser: 1,
        nbFilesExternal: 1
      }
    },
    { $sort: { day: -1 } }
  ]

  return await mongo.db.collection('daily-api-metrics').aggregate(aggregate).toArray()
}

export const getDataset = async (account: Account, query: { start: string, end: string }, datasetsId: string[]) => {
  const $match: Record<string, any> = {
    'owner.type': account.type,
    'owner.id': account.id,
    statusClass: 'ok',
    day: {
      $gte: query.start,
      $lte: query.end
    },
    operationTrack: { $in: ['readDataAPI', 'readDataFiles'] },
    'resource.type': 'datasets',
    'resource.id': { $in: datasetsId }
  }

  if (account.department) $match['owner.department'] = account.department

  const aggregate = [
    { $match },
    {
      $group: {
        _id: {
          datasetId: '$resource.id',
          userClass: '$userClass'
        },
        nbRequests: { $sum: { $cond: [{ $eq: ['$operationTrack', 'readDataAPI'] }, '$nbRequests', 0] } },
        nbFiles: { $sum: { $cond: [{ $eq: ['$operationTrack', 'readDataFiles'] }, '$nbRequests', 0] } },
        title: { $last: '$resource.title' }
      }
    },
    {
      $group: {
        _id: '$_id.datasetId',
        title: { $last: '$title' },
        nbRequests: { $sum: '$nbRequests' },
        nbFiles: { $sum: '$nbFiles' },
        nbRequestsAnonymous: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'anonymous'] }, '$nbRequests', 0] } },
        nbRequestsOwner: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'owner'] }, '$nbRequests', 0] } },
        nbRequestsUser: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'user'] }, '$nbRequests', 0] } },
        nbRequestsExternal: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'external'] }, '$nbRequests', 0] } },
        nbRequestsOwnerAPIKey: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'ownerAPIKey'] }, '$nbRequests', 0] } },
        nbRequestsExternalAPIKey: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'externalAPIKey'] }, '$nbRequests', 0] } },
        nbFilesAnonymous: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'anonymous'] }, '$nbFiles', 0] } },
        nbFilesOwner: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'owner'] }, '$nbFiles', 0] } },
        nbFilesUser: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'user'] }, '$nbFiles', 0] } },
        nbFilesExternal: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'external'] }, '$nbFiles', 0] } }
      }
    },
    {
      $project: {
        _id: 0,
        id: '$_id',
        title: 1,
        nbRequests: 1,
        nbFiles: 1,
        nbRequestsAnonymous: 1,
        nbRequestsOwner: 1,
        nbRequestsUser: 1,
        nbRequestsExternal: 1,
        nbRequestsOwnerAPIKey: 1,
        nbRequestsExternalAPIKey: 1,
        nbFilesAnonymous: 1,
        nbFilesOwner: 1,
        nbFilesUser: 1,
        nbFilesExternal: 1
      }
    },
    { $sort: { nbRequests: -1 } }
  ]

  const results = await mongo.db.collection('daily-api-metrics').aggregate(aggregate).toArray()
  return new Map(results.map(item => [item.id, item]))
}

export const getOrigin = async (account: Account, query: { start: string, end: string }) => {
  const $match: Record<string, any> = {
    'owner.type': account.type,
    'owner.id': account.id,
    statusClass: 'ok',
    day: {
      $gte: query.start,
      $lte: query.end
    }
  }
  if (account.department) $match['owner.department'] = account.department

  const aggregate = [
    { $match },
    {
      $group: {
        _id: {
          origin: '$refererDomain',
          userClass: '$userClass'
        },
        nbRequests: { $sum: '$nbRequests' },
      }
    },
    {
      $group: {
        _id: '$_id.origin',
        nbRequests: { $sum: '$nbRequests' },
        nbRequestsAnonymous: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'anonymous'] }, '$nbRequests', 0] } },
        nbRequestsOwner: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'owner'] }, '$nbRequests', 0] } },
        nbRequestsUser: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'user'] }, '$nbRequests', 0] } },
        nbRequestsExternal: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'external'] }, '$nbRequests', 0] } },
        nbRequestsOwnerAPIKey: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'ownerAPIKey'] }, '$nbRequests', 0] } },
        nbRequestsExternalAPIKey: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'externalAPIKey'] }, '$nbRequests', 0] } },
      }
    },
    {
      $project: {
        _id: 0,
        origin: '$_id',
        nbRequests: 1,
        nbFiles: 1,
        nbRequestsAnonymous: 1,
        nbRequestsOwner: 1,
        nbRequestsUser: 1,
        nbRequestsExternal: 1,
        nbRequestsOwnerAPIKey: 1,
        nbRequestsExternalAPIKey: 1
      }
    },
    { $sort: { nbRequests: -1 } }
  ]

  return await mongo.db.collection('daily-api-metrics').aggregate(aggregate).toArray()
}

export const getApp = async (account: Account, query: { start: string, end: string }, applicationsId: string[]) => {
  const $match: Record<string, any> = {
    'owner.type': account.type,
    'owner.id': account.id,
    statusClass: 'ok',
    day: {
      $gte: query.start,
      $lte: query.end
    },
    operationTrack: { $eq: 'openApplication' },
    'resource.type': 'applications',
    'resource.id': { $in: applicationsId }
  }
  if (account.department) $match['owner.department'] = account.department

  const aggregate = [
    { $match },
    {
      $group: {
        _id: {
          app: '$resource.id',
          userClass: '$userClass'
        },
        nbRequests: { $sum: '$nbRequests' },
        title: { $last: '$resource.title' }
      }
    },
    {
      $group: {
        _id: '$_id.app',
        title: { $last: '$title' },
        nbRequests: { $sum: '$nbRequests' },
        nbRequestsAnonymous: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'anonymous'] }, '$nbRequests', 0] } },
        nbRequestsOwner: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'owner'] }, '$nbRequests', 0] } },
        nbRequestsUser: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'user'] }, '$nbRequests', 0] } },
        nbRequestsExternal: { $sum: { $cond: [{ $eq: ['$_id.userClass', 'external'] }, '$nbRequests', 0] } }
      }
    },
    {
      $project: {
        _id: 0,
        id: '$_id',
        title: 1,
        nbRequests: 1,
        nbFiles: 1,
        nbRequestsAnonymous: 1,
        nbRequestsOwner: 1,
        nbRequestsUser: 1,
        nbRequestsExternal: 1
      }
    },
    { $sort: { nbRequests: -1 } }
  ]

  const results = await mongo.db.collection('daily-api-metrics').aggregate(aggregate).toArray()
  return new Map(results.map(item => [item.id, item]))
}

export const getUserClass = async (account: Account, query: { start: string, end: string }) => {
  const $match: Record<string, any> = {
    'owner.type': account.type,
    'owner.id': account.id,
    statusClass: 'ok',
    day: {
      $gte: query.start,
      $lte: query.end
    }
  }
  if (account.department) $match['owner.department'] = account.department

  const aggregate = [
    { $match },
    {
      $group: {
        _id: '$userClass',
        nbRequests: { $sum: '$nbRequests' }
      }
    },
    { $sort: { nbRequests: -1 } }
  ]

  return await mongo.db.collection('daily-api-metrics').aggregate(aggregate).toArray() as { _id: string, nbRequests: number }[]
}

export const getTotal = async (account: Account, query: { start: string; end: string }) => {
  const $match: Record<string, any> = {
    'owner.type': account.type,
    'owner.id': account.id,
    statusClass: 'ok'
  }
  if (account.department) $match['owner.department'] = account.department

  // Calculate the previous period
  const previousStart = new Date(query.start)
  const previousEnd = new Date(query.end)
  previousStart.setMonth(previousStart.getMonth() - 1)
  previousEnd.setMonth(previousEnd.getMonth() - 1)

  const aggregate = [
    { $match },
    {
      $facet: {
        current: [
          {
            $match: {
              day: {
                $gte: query.start,
                $lte: query.end
              }
            }
          },
          {
            $group: {
              _id: '$operationTrack',
              nbRequests: { $sum: '$nbRequests' }
            }
          }
        ],
        previous: [
          {
            $match: {
              day: {
                $gte: previousStart.toISOString().split('T')[0],
                $lte: previousEnd.toISOString().split('T')[0]
              }
            }
          },
          {
            $group: {
              _id: '$operationTrack',
              nbRequests: { $sum: '$nbRequests' }
            }
          }
        ]
      }
    }
  ]

  const result = await mongo.db.collection('daily-api-metrics').aggregate(aggregate).toArray()

  if (result.length === 0) {
    return {
      current: { openApplication: 0, readDataAPI: 0, readDataFiles: 0 },
      previous: { openApplication: 0, readDataAPI: 0, readDataFiles: 0 }
    }
  }

  const ensureClasses = (data: Record<string, number>) => {
    const classes = ['openApplication', 'readDataAPI', 'readDataFiles']
    for (const cls of classes) if (!(cls in data)) data[cls] = 0
    return data
  }

  return {
    current: ensureClasses(
      Object.fromEntries(result[0].current.map(({ _id, nbRequests }: { _id: string; nbRequests: number }) => [_id, nbRequests]))
    ),
    previous: ensureClasses(
      Object.fromEntries(result[0].previous.map(({ _id, nbRequests }: { _id: string; nbRequests: number }) => [_id, nbRequests]))
    )
  }
}
