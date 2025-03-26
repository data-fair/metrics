import { Router } from 'express'
import { session } from '@data-fair/lib-express/index.js'
import * as aggQuery from '#doc/agg-query/index.ts'
import * as exportQuery from '#doc/export-query/index.ts'
import generate from './export.ts'

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
  const query = { ...req.query } // better not to mutate req.query
  if (typeof query.split === 'string') query.split = query.split.split(',')
  aggQuery.assertValid(query, { lang: reqSession.lang, name: 'query' })
  const result = await agg(reqSession.account, query)
  res.json(result)
})

router.get('/_export', async (req, res) => {
  const reqSession = await session.reqAuthenticated(req)
  const query = { ...req.query } // better not to mutate req.query
  exportQuery.assertValid(query, { lang: reqSession.lang, name: 'query' })

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename=${query.start}_${query.end}.xlsx`)

  await generate(reqSession.account, query, res)
})
