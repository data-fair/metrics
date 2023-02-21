import { Router } from 'express'
import asyncHandler from 'express-async-handler'
import { reqBuilder } from '@data-fair/lib/express/req'
import { type ListResponse, listResponseSchema } from 'types/list-response'
import { type AggResult, aggResultSchema } from 'types/agg-result'
import { type AggQuery, aggQuerySchema } from 'types/agg-query'

import { list, agg } from './service'

const router = Router()
export default router

const listReq = reqBuilder<null, null, ListResponse>(null, null, listResponseSchema)
router.get('', asyncHandler(async (req, res) => {
  if (!req.session.account) { res.status(401).send(); return }
  const { send } = listReq(req, res)
  const results = await list(req.session.account)
  send({ count: results.length, results })
}))

const aggReq = reqBuilder<AggQuery, null, AggResult>(aggQuerySchema, null, aggResultSchema)
router.get('/_agg', asyncHandler(async (req, res) => {
  if (!req.session.account) { res.status(401).send(); return }
  if (typeof req.query.split === 'string') req.query.split = req.query.split.split(',')
  const { query, send } = aggReq(req, res)
  const result = await agg(req.session.account, query)
  send(result)
}))
