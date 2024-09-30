import { Router } from 'express'
import { session } from '@data-fair/lib/express/index.js'
import doc from '../../doc/index.ts'

import { list, agg } from './service.ts'

const router = Router()
export default router

router.get('', async (req, res) => {
  const reqSession = await session.reqAuthenticated(req)
  const results = await list(reqSession.account)
  res.json({ count: results.length, results })
})

router.get('/_agg', async (req, res) => {
  const reqSession = await session.reqAuthenticated(req)
  if (typeof req.query.split === 'string') req.query.split = req.query.split.split(',')
  const query = doc.aggQuery.returnValid(req.query, { lang: reqSession.lang, name: 'query' })
  const result = await agg(reqSession.account, query)
  res.json(result)
})
