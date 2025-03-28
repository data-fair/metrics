import type { Account } from '@data-fair/lib-express'
import type { Response } from 'express'
import type { ExportQuery } from '#doc'

import Excel from 'exceljs'
import dayjs from 'dayjs'
import { getApp, getDataset, getHistory, getOrigin, getTotal, getUserClass } from './service.ts'

const userClasses = {
  anonymous: 'Anonyme',
  owner: 'Propriétaire',
  user: 'Utilisateur',
  external: 'Utilisateur externe',
  ownerAPIKey: 'Propriétaire (clé d\'API)',
  externalAPIKey: 'Utilisateur externe (clé d\'API)',
  ownerProcessing: 'Propriétaire (traitement)',
  externalProcessing: 'Utilisateur externe (traitement)'
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
  nbRequestsUser: number
  nbRequestsExternal: number
  nbRequestsOwnerAPIKey: number
  nbRequestsExternalAPIKey: number
}

// Helper functions for worksheet setup
const setupWorksheets = (workbook: Excel.stream.xlsx.WorkbookWriter) => {
  workbook.creator = 'Data-Fair'
  workbook.created = new Date()

  const global = workbook.addWorksheet('Global')
  global.getColumn(1).width = 40

  const history = workbook.addWorksheet('Historique')
  history.columns = [
    { header: 'Date', key: 'day', width: 15 },
    { header: 'Nombre total des appels API', key: 'nbRequests', width: 20 },
    { header: 'Nombre total des fichiers téléchargés', key: 'nbFiles', width: 30 },
    { header: 'Nombre d\'appels API par anonyme', key: 'nbRequestsAnonymous', width: 30 },
    { header: 'Nombre d\'appels API par propriétaire', key: 'nbRequestsOwner', width: 30 },
    { header: 'Nombre d\'appels API par utilisateur', key: 'nbRequestsUser', width: 30 },
    { header: 'Nombre d\'appels API par utilisateur externe', key: 'nbRequestsExternal', width: 30 },
    { header: 'Nombre d\'appels API par propriétaire (clé d\'API)', key: 'nbRequestsOwnerAPIKey', width: 30 },
    { header: 'Nombre d\'appels API par utilisateur externe (clé d\'API)', key: 'nbRequestsExternalAPIKey', width: 30 },
    { header: 'Nombre de fichiers téléchargés par anonyme', key: 'nbFilesAnonymous', width: 30 },
    { header: 'Nombre de fichiers téléchargés par propriétaire', key: 'nbFilesOwner', width: 30 },
    { header: 'Nombre de fichiers téléchargés par utilisateur', key: 'nbFilesUser', width: 30 },
    { header: 'Nombre de fichiers téléchargés par utilisateur externe', key: 'nbFilesExternal', width: 30 }
  ]

  const dataset = workbook.addWorksheet('Jeu de données')
  dataset.columns = [
    { header: 'Identifiant', key: 'id', width: 10 },
    { header: 'Url', key: 'link', width: 20 },
    { header: 'Titre', key: 'title', width: 40 },
    { header: 'Nombre total des appels API', key: 'nbRequests', width: 20 },
    { header: 'Nombre total des fichiers téléchargés', key: 'nbFiles', width: 30 },
    { header: 'Nombre d\'appels API par anonyme', key: 'nbRequestsAnonymous', width: 30 },
    { header: 'Nombre d\'appels API par propriétaire', key: 'nbRequestsOwner', width: 30 },
    { header: 'Nombre d\'appels API par utilisateur', key: 'nbRequestsUser', width: 30 },
    { header: 'Nombre d\'appels API par utilisateur externe', key: 'nbRequestsExternal', width: 30 },
    { header: 'Nombre d\'appels API par propriétaire (clé d\'API)', key: 'nbRequestsOwnerAPIKey', width: 30 },
    { header: 'Nombre d\'appels API par utilisateur externe (clé d\'API)', key: 'nbRequestsExternalAPIKey', width: 30 },
    { header: 'Nombre de fichiers téléchargés par anonyme', key: 'nbFilesAnonymous', width: 30 },
    { header: 'Nombre de fichiers téléchargés par propriétaire', key: 'nbFilesOwner', width: 30 },
    { header: 'Nombre de fichiers téléchargés par utilisateur', key: 'nbFilesUser', width: 30 },
    { header: 'Nombre de fichiers téléchargés par utilisateur externe', key: 'nbFilesExternal', width: 30 }
  ]

  const topic = workbook.addWorksheet('Thématiques')
  topic.columns = [
    { header: 'Thématique', key: 'topic', width: 30 },
    { header: 'Nombre total des appels API', key: 'nbRequests', width: 20 },
    { header: 'Nombre d\'appels API par anonyme', key: 'nbRequestsAnonymous', width: 30 },
    { header: 'Nombre d\'appels API par propriétaire', key: 'nbRequestsOwner', width: 30 },
    { header: 'Nombre d\'appels API par utilisateur', key: 'nbRequestsUser', width: 30 },
    { header: 'Nombre d\'appels API par utilisateur externe', key: 'nbRequestsExternal', width: 30 },
    { header: 'Nombre d\'appels API par propriétaire (clé d\'API)', key: 'nbRequestsOwnerAPIKey', width: 30 },
    { header: 'Nombre d\'appels API par utilisateur externe (clé d\'API)', key: 'nbRequestsExternalAPIKey', width: 30 }
  ]

  const origin = workbook.addWorksheet('Origine')
  origin.columns = [
    { header: 'Origine', key: 'origin', width: 30 },
    { header: 'Nombre total des appels API', key: 'nbRequests', width: 20 },
    { header: 'Nombre d\'appels API par anonyme', key: 'nbRequestsAnonymous', width: 30 },
    { header: 'Nombre d\'appels API par propriétaire', key: 'nbRequestsOwner', width: 30 },
    { header: 'Nombre d\'appels API par utilisateur', key: 'nbRequestsUser', width: 30 },
    { header: 'Nombre d\'appels API par utilisateur externe', key: 'nbRequestsExternal', width: 30 },
    { header: 'Nombre d\'appels API par propriétaire (clé d\'API)', key: 'nbRequestsOwnerAPIKey', width: 30 },
    { header: 'Nombre d\'appels API par utilisateur externe (clé d\'API)', key: 'nbRequestsExternalAPIKey', width: 30 }
  ]

  const app = workbook.addWorksheet('Visualisation')
  app.columns = [
    { header: 'Identifiant', key: 'id', width: 10 },
    { header: 'Url', key: 'link', width: 20 },
    { header: 'Titre', key: 'title', width: 40 },
    { header: 'Nombre total d\'ouvertures', key: 'nbRequests', width: 20 },
    { header: 'Nombre d\'ouvertures par anonyme', key: 'nbRequestsAnonymous', width: 30 },
    { header: 'Nombre d\'ouvertures par propriétaire', key: 'nbRequestsOwner', width: 30 },
    { header: 'Nombre d\'ouvertures par utilisateur', key: 'nbRequestsUser', width: 30 },
    { header: 'Nombre d\'ouvertures par utilisateur externe', key: 'nbRequestsExternal', width: 30 }
  ]

  return { global, history, dataset, topic, origin, app }
}

// Process history data to fill gaps
const processHistoryData = (historyData: any[]) => {
  if (historyData.length === 0) return []

  const historyDates = new Set(historyData.map(item => item.day))
  const formattedResults = []
  let lastDate = new Date(historyData[0].day)

  for (const item of historyData) {
    const currentDate = new Date(item.day)

    // Fill gaps in dates
    // eslint-disable-next-line no-unmodified-loop-condition
    while (lastDate > currentDate) {
      lastDate.setDate(lastDate.getDate() - 1)
      const missingDate = lastDate.toISOString().split('T')[0]

      if (!historyDates.has(missingDate)) {
        formattedResults.push({
          day: missingDate,
          nbRequests: 0,
          nbFiles: 0,
          nbRequestsAnonymous: 0,
          nbRequestsOwner: 0,
          nbRequestsUser: 0,
          nbRequestsExternal: 0,
          nbRequestsOwnerAPIKey: 0,
          nbRequestsExternalAPIKey: 0,
          nbFilesAnonymous: 0,
          nbFilesOwner: 0,
          nbFilesUser: 0,
          nbFilesExternal: 0
        })
      }
    }

    formattedResults.push(item)
    lastDate = new Date(item.day)
  }

  return formattedResults
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
    stats.nbRequestsAnonymous += datasetMetrics.nbRequestsAnonymous || 0
    stats.nbRequestsOwner += datasetMetrics.nbRequestsOwner || 0
    stats.nbRequestsUser += datasetMetrics.nbRequestsUser || 0
    stats.nbRequestsExternal += datasetMetrics.nbRequestsExternal || 0
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

  const { global, history, dataset, topic, origin, app } = setupWorksheets(workbook)
  const topicsStats = topics.reduce((acc, topic) => {
    acc[topic.id] = {
      id: topic.id,
      title: topic.title,
      nbRequests: 0,
      nbFiles: 0,
      nbRequestsAnonymous: 0,
      nbRequestsOwner: 0,
      nbRequestsUser: 0,
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

  // Process history data
  const processedHistoryData = processHistoryData(historyData)
  for (const item of processedHistoryData) {
    history.addRow([
      formatDate(item.day),
      item.nbRequests,
      item.nbFiles,
      item.nbRequestsAnonymous,
      item.nbRequestsOwner,
      item.nbRequestsUser,
      item.nbRequestsExternal,
      item.nbRequestsOwnerAPIKey,
      item.nbRequestsExternalAPIKey,
      item.nbFilesAnonymous,
      item.nbFilesOwner,
      item.nbFilesUser,
      item.nbFilesExternal
    ])
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
    dataset.addRow([
      datasetRes.id,
      `${baseUrl}/data-fair/dataset/${datasetRes.id}`,
      datasetRes.title,
      item?.nbRequests || 0,
      item?.nbFiles || 0,
      item?.nbRequestsAnonymous || 0,
      item?.nbRequestsOwner || 0,
      item?.nbRequestsUser || 0,
      item?.nbRequestsExternal || 0,
      item?.nbRequestsOwnerAPIKey || 0,
      item?.nbRequestsExternalAPIKey || 0,
      item?.nbFilesAnonymous || 0,
      item?.nbFilesOwner || 0,
      item?.nbFilesUser || 0,
      item?.nbFilesExternal || 0
    ])

    updateTopicStats(topicsStats, datasetRes, item)
  }

  // Process topics data
  const sortedTopics = Object.values(topicsStats).sort((a, b) => b.nbRequests - a.nbRequests)
  for (const item of sortedTopics) {
    topic.addRow([
      item.title,
      item.nbRequests,
      item.nbRequestsAnonymous,
      item.nbRequestsOwner,
      item.nbRequestsUser,
      item.nbRequestsExternal,
      item.nbRequestsOwnerAPIKey,
      item.nbRequestsExternalAPIKey
    ])
  }

  // Process origin data
  for (const item of originResults) {
    origin.addRow([
      item.origin === 'none' ? 'Inconnu' : item.origin,
      item.nbRequests,
      item.nbRequestsAnonymous,
      item.nbRequestsOwner,
      item.nbRequestsUser,
      item.nbRequestsExternal,
      item.nbRequestsOwnerAPIKey,
      item.nbRequestsExternalAPIKey
    ])
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
    app.addRow([
      application.id,
      `${baseUrl}/data-fair/application/${application.id}`,
      application.title || '',
      item?.nbRequests || 0,
      item?.nbRequestsAnonymous || 0,
      item?.nbRequestsOwner || 0,
      item?.nbRequestsUser || 0,
      item?.nbRequestsExternal || 0
    ])
  }

  // Add global stats
  global.addRow([`Période du ${formatDate(query.start)} au ${formatDate(query.end)}`])
  global.addRow(['Nombre total d\'appels API', totalResults.readDataAPI || 0])
  global.addRow(['Nombre total de fichiers téléchargés', totalResults.readDataFiles || 0])
  global.addRow(['Nombre total d\'ouvertures', totalResults.openApplication || 0])
  global.addRow([])

  // Add user class stats
  global.addRow(['Nombre d\'appels API par catégorie d\'utilisateur'])
  for (const item of userClassResults) {
    const className = userClasses[item._id as keyof typeof userClasses]
    global.addRow([className, item.nbRequests])
  }

  await workbook.commit()
}

export default generate
