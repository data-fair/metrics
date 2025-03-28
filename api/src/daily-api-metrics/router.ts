import { Router } from 'express'
import { session, reqOrigin } from '@data-fair/lib-express/index.js'
import axios from '@data-fair/lib-node/axios.js'
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
  let filteredDatasetIds: string[] | null = null
  if (query.topicId) {
    const datasets: { id: string, topics?: { id: string, name: string }[] }[] = (await axios.get(
      new URL('/data-fair/api/v1/datasets', reqOrigin(req)).toString(),
      {
        params: {
          mine: true,
          raw: true,
          select: 'id,topics',
          size: 10000
        },
        headers: {
          Cookie: req.headers.cookie
        }
      }
    )).data.results || []

    filteredDatasetIds = datasets.filter(dataset =>
      dataset.topics?.some(topic => topic.id === query.topicId)
    ).map(dataset => dataset.id)
  }
  const result = await agg(reqSession.account, query, filteredDatasetIds)
  res.json(result)
})

router.get('/_export', async (req, res) => {
  const reqSession = await session.reqAuthenticated(req)
  const query = { ...req.query } // better not to mutate req.query
  exportQuery.assertValid(query, { lang: reqSession.lang, name: 'query' })

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename=Audience_${query.start}_${query.end}.xlsx`)

  const datasets = (await axios.get(
    new URL('/data-fair/api/v1/datasets', reqOrigin(req)).toString(),
    {
      params: {
        mine: true,
        raw: true,
        select: 'id,topics,title',
        size: 10000
      },
      headers: {
        Cookie: req.headers.cookie
      }
    }
  )).data.results || []

  const applications = (await axios.get(
    new URL('/data-fair/api/v1/applications', reqOrigin(req)).toString(),
    {
      params: {
        mine: true,
        raw: true,
        select: 'id,title',
        size: 10000
      },
      headers: {
        Cookie: req.headers.cookie
      }
    }
  )).data.results || []

  const topics = (await axios.get(
    new URL(`/data-fair/api/v1/settings/${reqSession.account.type}/${reqSession.account.id}/topics`, reqOrigin(req)).toString(),
    {
      headers: {
        Cookie: req.headers.cookie
      }
    }
  )).data || []

  await generate(reqSession.account, query, datasets, applications, topics, reqOrigin(req), res)
})
