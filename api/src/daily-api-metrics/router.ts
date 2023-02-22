import { Router } from 'express'
import asyncHandler from 'express-async-handler'
import * as listResponseSchema from 'types/list-response'
import * as aggResultSchema from 'types/agg-result'
import * as aggQuerySchema from 'types/agg-query'

import { list, agg } from './service'

const router = Router()
export default router

router.get('', asyncHandler(async (req, res) => {
  if (!req.session.account) { res.status(401).send(); return }
  const results = await list(req.session.account)
  res.type('json').send(listResponseSchema.stringify({ count: results.length, results }))
}))

router.get('/_agg', asyncHandler(async (req, res) => {
  if (!req.session.account) { res.status(401).send(); return }
  if (typeof req.query.split === 'string') req.query.split = req.query.split.split(',')
  const query = aggQuerySchema.validate(req.query, req.session.lang, 'query')
  const result = await agg(req.session.account, query)
  res.type('json').send(aggResultSchema.stringify(result))
}))
