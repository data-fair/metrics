import { Router } from 'express'
import { session, asyncHandler } from '@data-fair/lib/express/index.js'
import { listResponseType, aggResultType } from '../../../shared/index.js'

import { list, agg } from './service'

const router = Router()
export default router

router.get('', asyncHandler(async (req, res) => {
  const reqSession = await session.reqAuthenticated(req)
  const results = await list(reqSession.account, req.query)
  res.type('json').send(listResponseType.stringify({ count: results.length, results }))
}))

router.get('/_agg', asyncHandler(async (req, res) => {
  if (!req.session.account) { res.status(401).send(); return }
  if (typeof req.query.split === 'string') req.query.split = req.query.split.split(',')
  const query = aggQuerySchema.validate(req.query, req.session.lang, 'query')
  const result = await agg(req.session.account, query)
  res.type('json').send(aggResultType.stringify(result))
}))
