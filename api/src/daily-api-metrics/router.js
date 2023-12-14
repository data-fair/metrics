import { Router } from 'express'
import { session, asyncHandler } from '@data-fair/lib/express/index.js'
import { listResponseType, aggResultType, aggQueryType } from '../../../shared/index.js'

import { list, agg } from './service.js'

const router = Router()
export default router

router.get('', asyncHandler(async (req, res) => {
  const reqSession = await session.reqAuthenticated(req)
  const results = await list(reqSession.account)
  res.type('json').send(listResponseType.stringify({ count: results.length, results }))
}))

router.get('/_agg', asyncHandler(async (req, res) => {
  const reqSession = await session.reqAuthenticated(req)
  if (typeof req.query.split === 'string') req.query.split = req.query.split.split(',')
  aggQueryType.assertValid(req.query, reqSession.lang, 'query')
  const result = await agg(reqSession.account, req.query)
  res.type('json').send(aggResultType.stringify(result))
}))