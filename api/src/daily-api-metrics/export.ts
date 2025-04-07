import type { Account } from '@data-fair/lib-express'
import type { Response } from 'express'
import type { ExportQuery } from '#doc'

import Excel from 'exceljs'
import dayjs from 'dayjs'
import { getApp, getDataset, getHistory, getOrigin, getTotal, getUserClass } from './service.ts'

const userClasses = {
  anonymous: 'Utilisateurs anonymes',
  owner: 'Utilisateurs membres',
  external: 'Utilisateurs externes',
  ownerAPIKey: 'Clés d\'API membres',
  externalAPIKey: 'Clés d\'API externes'
}

const formatDate = (date: string) => dayjs(date).format('DD/MM/YYYY')

// Types for better readability
type Dataset = { id: string; title: string; topics: { id: string; title: string }[] }
type Application = { id: string; title: string }
type Topic = { id: string; title: string }
type TopicStats = {
  id: string
  title: string
  nbRequests: number
  nbFiles: number
  nbRequestsAnonymous: number
  nbRequestsOwner: number
  nbRequestsExternal: number
  nbRequestsOwnerAPIKey: number
  nbRequestsExternalAPIKey: number
}

// Helper functions for worksheet setup
const setupWorksheets = (workbook: Excel.stream.xlsx.WorkbookWriter, query: { start: string, end: string }) => {
  workbook.creator = 'Data-Fair'
  workbook.created = new Date()

  const global = workbook.addWorksheet('Global')
  global.columns = [
    { header: '', key: 'metric', width: 35 },
    { header: `Période du ${formatDate(query.start)} au ${formatDate(query.end)}`, key: 'current', width: 35 },
    { header: 'Période précédente', key: 'previous', width: 20 },
    { header: 'Variation', key: 'variation', width: 10 }
  ]

  const history = workbook.addWorksheet('Historique')
  history.columns = [
    { header: 'Date', key: 'day', width: 15 },
    { header: 'Appels API / total', key: 'nbRequests', width: 25 },
    { header: 'Téléchargements / total', key: 'nbFiles', width: 25 },
    { header: 'Appels d\'API / Utilisateurs membres', key: 'nbRequestsOwner', width: 30 },
    { header: 'Appels d\'API / Utilisateurs externes', key: 'nbRequestsExternal', width: 30 },
    { header: 'Appels d\'API / Utilisateurs anonymes', key: 'nbRequestsAnonymous', width: 30 },
    { header: 'Appels d\'API / Clés d\'API membres', key: 'nbRequestsOwnerAPIKey', width: 30 },
    { header: 'Appels d\'API / Clés d\'API anonymes', key: 'nbRequestsExternalAPIKey', width: 30 },
    { header: 'Téléchargements / Utilisateurs membres', key: 'nbFilesOwner', width: 30 },
    { header: 'Téléchargements / Utilisateurs externes', key: 'nbFilesExternal', width: 30 },
    { header: 'Téléchargements / Utilisateurs anonymes', key: 'nbFilesAnonymous', width: 30 }
  ]

  const dataset = workbook.addWorksheet('Jeux de données')
  dataset.columns = [
    { header: 'Identifiant', key: 'id', width: 28 },
    { header: 'Titre', key: 'title', width: 40 },
    { header: 'Appels API / total', key: 'nbRequests', width: 25 },
    { header: 'Téléchargements / total', key: 'nbFiles', width: 25 },
    { header: 'Appels d\'API / Utilisateurs membres', key: 'nbRequestsOwner', width: 30 },
    { header: 'Appels d\'API / Utilisateurs externes', key: 'nbRequestsExternal', width: 30 },
    { header: 'Appels d\'API / Utilisateurs anonymes', key: 'nbRequestsAnonymous', width: 30 },
    { header: 'Appels d\'API / Clés d\'API membres', key: 'nbRequestsOwnerAPIKey', width: 30 },
    { header: 'Appels d\'API / Clés d\'API externes', key: 'nbRequestsExternalAPIKey', width: 30 },
    { header: 'Téléchargements / Utilisateurs membres', key: 'nbFilesOwner', width: 30 },
    { header: 'Téléchargements / Utilisateurs externes', key: 'nbFilesExternal', width: 30 },
    { header: 'Téléchargements / Utilisateurs anonymes', key: 'nbFilesAnonymous', width: 30 }
  ]

  const topic = workbook.addWorksheet('Appels d\'API par thématiques')
  topic.columns = [
    { header: 'Thématique', key: 'topic', width: 30 },
    { header: 'Tous les utilisateurs', key: 'nbRequests', width: 20 },
    { header: 'Utilisateurs membres', key: 'nbRequestsOwner', width: 20 },
    { header: 'Utilisateurs externes', key: 'nbRequestsExternal', width: 20 },
    { header: 'Utilisateurs anonymes', key: 'nbRequestsAnonymous', width: 20 },
    { header: 'Clés d\'API membres', key: 'nbRequestsOwnerAPIKey', width: 20 },
    { header: 'Clés d\'API externes', key: 'nbRequestsExternalAPIKey', width: 20 }
  ]

  const origin = workbook.addWorksheet('Appels d\'API par domaines')
  origin.columns = [
    { header: 'Domaine', key: 'origin', width: 30 },
    { header: 'Tous les utilisateurs', key: 'nbRequests', width: 20 },
    { header: 'Utilisateurs membres', key: 'nbRequestsOwner', width: 20 },
    { header: 'Utilisateurs externes', key: 'nbRequestsExternal', width: 20 },
    { header: 'Utilisateurs anonymes', key: 'nbRequestsAnonymous', width: 20 },
    { header: 'Clés d\'API membres', key: 'nbRequestsOwnerAPIKey', width: 20 },
    { header: 'Clés d\'API externes', key: 'nbRequestsExternalAPIKey', width: 20 }
  ]

  const app = workbook.addWorksheet('Affichages d\'applications')
  app.columns = [
    { header: 'Identifiant', key: 'id', width: 28 },
    { header: 'Titre', key: 'title', width: 40 },
    { header: 'Tous les utilisateurs', key: 'nbRequests', width: 20 },
    { header: 'Utilisateurs membres', key: 'nbRequestsOwner', width: 20 },
    { header: 'Utilisateurs externes', key: 'nbRequestsExternal', width: 20 },
    { header: 'Utilisateurs anonymes', key: 'nbRequestsAnonymous', width: 20 }
  ]

  return { global, history, dataset, topic, origin, app }
}

// Update topic stats based on dataset metrics
const updateTopicStats = (topicsStats: Record<string, TopicStats>, dataset: Dataset, datasetMetrics: any) => {
  if (!datasetMetrics || !dataset.topics) return

  for (const topic of dataset.topics) {
    const topicId = topic.id
    if (!topicsStats[topicId]) continue // Skip unknown topics

    const stats = topicsStats[topicId]
    stats.nbRequests += datasetMetrics.nbRequests || 0
    stats.nbFiles += datasetMetrics.nbFiles || 0
    stats.nbRequestsOwner += datasetMetrics.nbRequestsOwner || 0
    stats.nbRequestsExternal += datasetMetrics.nbRequestsExternal || 0
    stats.nbRequestsAnonymous += datasetMetrics.nbRequestsAnonymous || 0
    stats.nbRequestsOwnerAPIKey += datasetMetrics.nbRequestsOwnerAPIKey || 0
    stats.nbRequestsExternalAPIKey += datasetMetrics.nbRequestsExternalAPIKey || 0
  }
}

const generate = async (
  account: Account,
  query: ExportQuery,
  datasetsRes: Dataset[],
  applicationsRes: Application[],
  topics: Topic[],
  baseUrl: string,
  res: Response
) => {
  const datasetIds = datasetsRes.map(dataset => dataset.id)
  const applicationIds = applicationsRes.map(application => application.id)

  // Setup Excel workbook and sheets
  const workbook = new Excel.stream.xlsx.WorkbookWriter({
    stream: res,
    useStyles: true,
    useSharedStrings: true
  })

  const { global, history, dataset, topic, origin, app } = setupWorksheets(workbook, query)
  const topicsStats = topics.reduce((acc, topic) => {
    acc[topic.id] = {
      id: topic.id,
      title: topic.title,
      nbRequests: 0,
      nbFiles: 0,
      nbRequestsAnonymous: 0,
      nbRequestsOwner: 0,
      nbRequestsExternal: 0,
      nbRequestsOwnerAPIKey: 0,
      nbRequestsExternalAPIKey: 0
    }
    return acc
  }, {} as Record<string, TopicStats>)

  // Fetch all data in parallel for better performance
  const [historyData, datasetResults, originResults, appResults, totalResults, userClassResults] = await Promise.all([
    getHistory(account, query),
    getDataset(account, query, datasetIds),
    getOrigin(account, query),
    getApp(account, query, applicationIds),
    getTotal(account, query),
    getUserClass(account, query)
  ])

  // Process history data with date range from query
  const start = new Date(query.start)
  const end = new Date(query.end)
  const currentDate = new Date(end)
  let historyIndex = 0

  // eslint-disable-next-line no-unmodified-loop-condition
  while (start <= currentDate) {
    const dateString = currentDate.toISOString().split('T')[0]
    const existingData = historyData[historyIndex] && historyData[historyIndex].day === dateString

    const item =
      existingData
        ? historyData[historyIndex++]
        : {
            day: dateString,
            nbRequests: 0,
            nbFiles: 0,
            nbRequestsAnonymous: 0,
            nbRequestsOwner: 0,
            nbRequestsExternal: 0,
            nbRequestsOwnerAPIKey: 0,
            nbRequestsExternalAPIKey: 0,
            nbFilesAnonymous: 0,
            nbFilesOwner: 0,
            nbFilesExternal: 0
          }

    history.addRow([
      formatDate(item.day),
      item.nbRequests,
      item.nbFiles,
      item.nbRequestsOwner,
      item.nbRequestsExternal,
      item.nbRequestsAnonymous,
      item.nbRequestsOwnerAPIKey,
      item.nbRequestsExternalAPIKey,
      item.nbFilesOwner,
      item.nbFilesExternal,
      item.nbFilesAnonymous
    ])
    currentDate.setDate(currentDate.getDate() - 1)
  }

  // Sort datasets by request count for more meaningful presentation
  const sortedDatasets = [...datasetsRes].sort((a, b) => {
    const aRequests = datasetResults.get(a.id)?.nbRequests || 0
    const bRequests = datasetResults.get(b.id)?.nbRequests || 0
    return bRequests - aRequests
  })

  // Process dataset data and update topic stats
  for (const datasetRes of sortedDatasets) {
    const item = datasetResults.get(datasetRes.id)
    dataset.addRow({
      id: {
        text: datasetRes.id,
        hyperlink: `${baseUrl}/data-fair/dataset/${datasetRes.id}`
      },
      title: datasetRes.title,
      nbRequests: item?.nbRequests || 0,
      nbFiles: item?.nbFiles || 0,
      nbRequestsOwner: item?.nbRequestsOwner || 0,
      nbRequestsExternal: item?.nbRequestsExternal || 0,
      nbRequestsAnonymous: item?.nbRequestsAnonymous || 0,
      nbRequestsOwnerAPIKey: item?.nbRequestsOwnerAPIKey || 0,
      nbRequestsExternalAPIKey: item?.nbRequestsExternalAPIKey || 0,
      nbFilesOwner: item?.nbFilesOwner || 0,
      nbFilesExternal: item?.nbFilesExternal || 0,
      nbFilesAnonymous: item?.nbFilesAnonymous || 0
    })

    updateTopicStats(topicsStats, datasetRes, item)
  }

  // Process topics data
  const sortedTopics = Object.values(topicsStats).sort((a, b) => b.nbRequests - a.nbRequests)
  for (const item of sortedTopics) {
    topic.addRow({
      topic: item.title,
      nbRequests: item.nbRequests,
      nbRequestsAnonymous: item.nbRequestsAnonymous,
      nbRequestsOwner: item.nbRequestsOwner,
      nbRequestsExternal: item.nbRequestsExternal,
      nbRequestsOwnerAPIKey: item.nbRequestsOwnerAPIKey,
      nbRequestsExternalAPIKey: item.nbRequestsExternalAPIKey
    })
  }

  // Process origin data
  for (const item of originResults) {
    origin.addRow({
      origin: item.origin === 'none' ? 'Inconnu' : item.origin,
      nbRequests: item.nbRequests,
      nbRequestsOwner: item.nbRequestsOwner,
      nbRequestsExternal: item.nbRequestsExternal,
      nbRequestsAnonymous: item.nbRequestsAnonymous,
      nbRequestsOwnerAPIKey: item.nbRequestsOwnerAPIKey,
      nbRequestsExternalAPIKey: item.nbRequestsExternalAPIKey
    })
  }

  // Sort applications by request count
  const sortedApplications = [...applicationsRes].sort((a, b) => {
    const aRequests = appResults.get(a.id)?.nbRequests || 0
    const bRequests = appResults.get(b.id)?.nbRequests || 0
    return bRequests - aRequests
  })

  // Process application data
  for (const application of sortedApplications) {
    const item = appResults.get(application.id)
    app.addRow({
      id: {
        text: application.id,
        hyperlink: `${baseUrl}/data-fair/dataset/${application.id}`
      },
      title: application.title || '',
      nbRequests: item?.nbRequests || 0,
      nbRequestsOwner: item?.nbRequestsOwner || 0,
      nbRequestsExternal: item?.nbRequestsExternal || 0,
      nbRequestsAnonymous: item?.nbRequestsAnonymous || 0
    })
  }

  // Add global stats
  global.addRow(['Appels d\'API', totalResults.current.readDataAPI, totalResults.previous.readDataAPI])
  global.addRow(['Fichiers téléchargés', totalResults.current.readDataFiles, totalResults.previous.readDataFiles])
  global.addRow(['Affichages d\'applications', totalResults.current.openApplication, totalResults.previous.openApplication])

  const COLOR = {
    POSITIVE: '4CAF50', // Green
    NEGATIVE: 'FF5252', // Red
    NEUTRAL: 'C0C0C0'   // Gray
  }

  const metrics = [
    { row: 2, current: totalResults.current.readDataAPI, previous: totalResults.previous.readDataAPI },
    { row: 3, current: totalResults.current.readDataFiles, previous: totalResults.previous.readDataFiles },
    { row: 4, current: totalResults.current.openApplication, previous: totalResults.previous.openApplication }
  ]

  metrics.forEach(({ row, current, previous }) => {
    const cell = global.getCell(`D${row}`)
    const diff = current - previous
    cell.value = {
      formula: `=(B${row}-C${row})/C${row}`,
      result: previous !== 0 ? diff / previous : diff === 0 ? 0 : 1
    }

    cell.numFmt = '0.00%'
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: {
        argb: diff > 0 ? COLOR.POSITIVE : (diff < 0 ? COLOR.NEGATIVE : COLOR.NEUTRAL)
      }
    }
  })

  global.addRow([])

  // Add user class stats
  global.addRow(['Répartition par catégories d\'utilisateurs'])
  const userClassMap = new Map()
  userClassResults.current.forEach((item: { _id: string; nbRequests: any }) => {
    if (userClasses[item._id as keyof typeof userClasses]) {
      userClassMap.set(item._id, {
        className: userClasses[item._id as keyof typeof userClasses],
        current: item.nbRequests,
        previous: 0
      })
    }
  })
  userClassResults.previous.forEach((item: { _id: string; nbRequests: any }) => {
    if (userClassMap.has(item._id)) {
      userClassMap.get(item._id).previous = item.nbRequests
    } else if (userClasses[item._id as keyof typeof userClasses]) {
      userClassMap.set(item._id, {
        className: userClasses[item._id as keyof typeof userClasses],
        current: 0,
        previous: item.nbRequests
      })
    }
  })
  let rowIndex = 7
  userClassMap.forEach((data, id) => {
    global.addRow([data.className, data.current, data.previous])

    // Calculate and format percentage change
    const cell = global.getCell(`D${rowIndex}`)
    const diff = data.current - data.previous
    cell.value = {
      formula: `=(B${rowIndex}-C${rowIndex})/C${rowIndex}`,
      result: data.previous !== 0 ? diff / data.previous : diff === 0 ? 0 : 1
    }

    cell.numFmt = '0.00%'
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: {
        argb: diff > 0 ? COLOR.POSITIVE : (diff < 0 ? COLOR.NEGATIVE : COLOR.NEUTRAL)
      }
    }

    rowIndex++
  })

  await workbook.commit()
}

export default generate
