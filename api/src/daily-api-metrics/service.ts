import type { Account } from '@data-fair/lib/shared/session.js'
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
