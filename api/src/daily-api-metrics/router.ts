import { Router } from 'express'
import { session, reqOrigin, httpError } from '@data-fair/lib-express/index.js'
import axios from '@data-fair/lib-node/axios.js'
import * as aggQuery from '#doc/agg-query/index.ts'
import * as exportQuery from '#doc/export-query/index.ts'
import generate from './export.ts'

import { list, agg, aggRows } from './service.ts'
import { requireOperationScope, exportScopesMessage } from '../scopes.ts'

const router = Router()
export default router

router.get('', requireOperationScope('listDailyApiMetrics'), async (req, res) => {
  const reqSession = await session.reqAuthenticated(req)
  const results = await list(reqSession.account)
  res.json({ count: results.length, results })
})

router.get('/_agg', requireOperationScope('aggDailyApiMetrics'), async (req, res) => {
  const reqSession = await session.reqAuthenticated(req)
  const query = { ...req.query } // better not to mutate req.query
  if (typeof query.split === 'string') query.split = query.split.split(',').filter(Boolean)
  aggQuery.assertValid(query, { lang: reqSession.lang, name: 'query' })
  if (query.format === 'rows') res.json(await aggRows(reqSession.account, query))
  else res.json(await agg(reqSession.account, query))
})

router.get('/_export', requireOperationScope('exportDailyApiMetrics'), async (req, res) => {
  const reqSession = await session.reqAuthenticated(req)
  const query = { ...req.query } // better not to mutate req.query
  exportQuery.assertValid(query, { lang: reqSession.lang, name: 'query' })

  // data-fair is called with the caller's credentials, cookie session or bearer token, through the
  // public url of the site: data-fair checks the audience of a bearer against it
  const upstreamHeaders: Record<string, string> = {}
  if (req.headers.cookie) upstreamHeaders.cookie = req.headers.cookie
  if (req.headers.authorization) upstreamHeaders.authorization = req.headers.authorization
  const dataFairGet = async (path: string, params?: Record<string, unknown>) => {
    try {
      return (await axios.get(new URL(`/data-fair/api/v1${path}`, reqOrigin(req)).toString(), { params, headers: upstreamHeaders })).data
    } catch (err: any) {
      // data-fair decides on its own scopes, a session accepted here can still lack them
      if (err.status === 401 || err.status === 403) throw httpError(403, exportScopesMessage)
      throw err
    }
  }

  const datasets = (await dataFairGet('/datasets', { mine: true, raw: true, select: 'id,topics,title', size: 10000 })).results || []
  const applications = (await dataFairGet('/applications', { mine: true, raw: true, select: 'id,title', size: 10000 })).results || []
  const topics = (await dataFairGet(`/settings/${reqSession.account.type}/${reqSession.account.id}/topics`)) || []

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename=Audience_${query.start}_${query.end}.xlsx`)

  // Fetch site theme so the export styling matches the site's palette.
  // Failure here is non-fatal: the export falls back to default colors.
  let themeColors: Record<string, string> | undefined
  try {
    const siteInfo = (await axios.get(
      new URL('/simple-directory/api/sites/_public', reqOrigin(req)).toString(),
      { headers: { Cookie: req.headers.cookie } }
    )).data
    themeColors = siteInfo?.theme?.colors
  } catch {
    themeColors = undefined
  }

  await generate(reqSession.account, reqSession.lang, query, datasets, applications, topics, reqOrigin(req), themeColors, res)
})
