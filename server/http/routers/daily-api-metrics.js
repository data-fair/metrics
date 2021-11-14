const express = require('express')
const camelCase = require('camel-case')
const asyncWrap = require('../../utils/async-wrap')
const router = module.exports = express.Router()

router.get('', asyncWrap(async (req, res, next) => {
  console.log('BIM')
  res.send([])
}))

router.get('/_agg', asyncWrap(async (req, res, next) => {
  const groupId = { day: '$day' }
  if (req.query.split) {
    const parts = req.query.split.split(',')
    for (const part of parts) {
      groupId[camelCase(part)] = '$' + part
    }
  }
  const pipeline = [
    {
      $match: {
        'owner.type': req.user.activeAccount.type,
        'owner.id': req.user.activeAccount.id
      }
    },
    {
      $sort: { day: 1 }
    },
    {
      $group: {
        _id: groupId,
        count: { $sum: 1 },
        nbRequests: { $sum: '$nbRequests' },
        bytes: { $sum: '$bytes' },
        duration: { $sum: '$duration' }
      }
    }
  ]
  const aggResult = await req.app.get('db').collection('daily-api-metrics').aggregate(pipeline).toArray()
  res.send(aggResult.map(r => ({ ...r._id, ...r, _id: undefined, meanDuration: r.duration / r.nbRequests, duration: undefined })))
}))
