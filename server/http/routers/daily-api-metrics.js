const express = require('express')
const camelCase = require('camel-case')
const dayjs = require('dayjs')
dayjs.extend(require('dayjs/plugin/utc'))
const asyncWrap = require('../../utils/async-wrap')
const router = module.exports = express.Router()

router.get('', asyncWrap(async (req, res, next) => {
  if (!req.user) return res.status(401).send()
  const query = {
    'owner.type': req.user.activeAccount.type,
    'owner.id': req.user.activeAccount.id
  }
  const results = (await req.app.get('db').collection('daily-api-metrics')
    .find(query)
    .sort({ day: 1 })
    .limit(10000)
    .toArray())
  res.send({ count: results.length, results })
}))

router.get('/_agg', asyncWrap(async (req, res, next) => {
  if (!req.user) return res.status(401).send()
  const $match = {
    'owner.type': req.user.activeAccount.type,
    'owner.id': req.user.activeAccount.id
  }
  if (req.query.start) $match.day = { ...$match.day, $gte: req.query.start }
  if (req.query.end) $match.day = { ...$match.day, $lte: req.query.end }
  if (req.query.statusClass) $match.statusClass = req.query.statusClass
  if (req.query.userClass) $match.userClass = req.query.userClass

  const $group = {
    _id: { day: '$day' },
    count: { $sum: 1 },
    nbRequests: { $sum: '$nbRequests' },
    bytes: { $sum: '$bytes' },
    duration: { $sum: '$duration' }
  }

  const seriesKey = []
  if (req.query.split) {
    const parts = req.query.split.split(',')
    for (const part of parts) {
      if (part === 'resource') {
        $group._id[camelCase('resource.type')] = '$resource.type'
        $group._id[camelCase('resource.id')] = '$resource.id'
        $group.resource = { $last: '$resource' }
      } else {
        seriesKey.push(camelCase(part))
        $group._id[camelCase(part)] = '$' + part
      }
    }
  }

  const pipeline = [
    { $match },
    { $group },
    { $sort: { '_id.day': 1 } }
  ]
  const aggResult = await req.app.get('db').collection('daily-api-metrics').aggregate(pipeline).toArray()
  const items = aggResult.map(r => ({ ...r._id, ...r, meanDuration: r.duration / r.nbRequests }))
  const days = []
  if (items.length) {
    const start = req.query['start-date'] || items[0].day
    const end = req.query['end-date'] || items[items.length - 1].day
    let current = dayjs.utc(start)
    while (current.toISOString().slice(0, 10) <= end) {
      const day = current.toISOString().slice(0, 10)
      if (!days.includes(day)) days.push(day)
      current = current.add(1, 'days')
    }
  }
  const series = []
  for (const item of items) {
    const key = seriesKey.reduce((a, key) => { a[key] = item[key]; return a }, {})
    if (item.resource) key.resource = item.resource
    let serie = series.find(s => JSON.stringify(s.key) === JSON.stringify(key))
    if (!serie) {
      serie = {
        key,
        nbRequests: 0,
        bytes: 0,
        days: {}
      }
      series.push(serie)
    }
    serie.nbRequests += item.nbRequests
    serie.bytes += item.bytes
    serie.days[item.day] = { nbRequests: item.nbRequests, bytes: item.bytes, meanDuration: item.meanDuration }
  }
  res.send({
    days,
    series
  })
}))
