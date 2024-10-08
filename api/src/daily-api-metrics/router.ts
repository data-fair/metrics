import { Router } from 'express'
import { session } from '@data-fair/lib-express/index.js'
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
  const reqQuery = { ...req.query }
  if (typeof reqQuery.split === 'string') reqQuery.split = reqQuery.split.split(',')
  const query = doc.aggQuery.returnValid(reqQuery, { lang: reqSession.lang, name: 'query' })
  const result = await agg(reqSession.account, query)
  res.json(result)
})
