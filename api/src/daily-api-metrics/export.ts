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

const generate = async (account: Account, query: ExportQuery, datasetsRes: { id: string; title: string; topics: { id: string; title: string }[] }[], applicationsRes: { id: string; title: string }[], topics: { id: string; title: string }[], baseUrl: string, res: Response) => {
  const datasetIds = datasetsRes.map((dataset: any) => dataset.id)
  const applicationIds = applicationsRes.map((application: any) => application.id)

  const workbook = new Excel.stream.xlsx.WorkbookWriter({
    stream: res,
    useStyles: true,
    useSharedStrings: true
  })
  workbook.creator = 'Data-Fair'
  workbook.created = new Date()

  const global = workbook.addWorksheet('Global')
  const history = workbook.addWorksheet('Historique')
  const dataset = workbook.addWorksheet('Jeu de données')
  const topic = workbook.addWorksheet('Thématiques')
  const origin = workbook.addWorksheet('Origine')
  const app = workbook.addWorksheet('Visualisation')

  global.getColumn(1).width = 40
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
  await getHistory(account, query).then((results) => {
    const historyDates = new Set(results.map(item => item.day))
    const formattedResults = []

    let lastDate = results.length > 0 ? new Date(results[0].day) : null

    for (const item of results) {
      const currentDate = new Date(item.day)

      // eslint-disable-next-line no-unmodified-loop-condition
      while (lastDate && lastDate > currentDate) {
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

    for (const item of formattedResults) {
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
  })

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
  }, {} as Record<string, any>)

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
  await getDataset(account, query, datasetIds).then((results) => {
    const sortedDatasets = datasetsRes.sort((a, b) => {
      const aRequests = results.get(a.id)?.nbRequests || 0
      const bRequests = results.get(b.id)?.nbRequests || 0
      return bRequests - aRequests
    })

    for (const datasetRes of sortedDatasets) {
      const item = results.get(datasetRes.id)
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

      if (!item || !datasetRes.topics) continue
      for (const topicId of datasetRes.topics.map(topic => topic.id)) {
        if (!topicsStats[topicId]) continue // Ignore unknown topics

        topicsStats[topicId].nbRequests += item.nbRequests
        topicsStats[topicId].nbFiles += item.nbFiles
        topicsStats[topicId].nbRequestsAnonymous += item.nbRequestsAnonymous
        topicsStats[topicId].nbRequestsOwner += item.nbRequestsOwner
        topicsStats[topicId].nbRequestsUser += item.nbRequestsUser
        topicsStats[topicId].nbRequestsExternal += item.nbRequestsExternal
        topicsStats[topicId].nbRequestsOwnerAPIKey += item.nbRequestsOwnerAPIKey
        topicsStats[topicId].nbRequestsExternalAPIKey += item.nbRequestsExternalAPIKey
      }
    }
  })

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
  Object.values(topicsStats).sort((a, b) => b.nbRequests - a.nbRequests)
  for (const item of Object.values(topicsStats)) {
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
  await getOrigin(account, query).then((results) => {
    for (const item of results) {
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
  })

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
  await getApp(account, query, applicationIds).then((results) => {
    const sortedApplications = applicationsRes.sort((a, b) => {
      const aRequests = results.get(a.id)?.nbRequests || 0
      const bRequests = results.get(b.id)?.nbRequests || 0
      return bRequests - aRequests
    })

    for (const application of sortedApplications) {
      const item = results.get(application.id)
      app.addRow([
        application.id,
        `${baseUrl}/data-fair/application/${application.id}`,
        application.title || 0,
        item?.nbRequests || 0,
        item?.nbRequestsAnonymous || 0,
        item?.nbRequestsOwner || 0,
        item?.nbRequestsUser || 0,
        item?.nbRequestsExternal || 0
      ])
    }
  })

  await getTotal(account, query).then((result) => {
    global.addRow([`Période du ${formatDate(query.start)} au ${formatDate(query.end)}`])
    global.addRow(['Nombre total d\'appels API', result.readDataAPI])
    global.addRow(['Nombre total de fichiers téléchargés', result.readDataFiles])
    global.addRow(['Nombre total d\'ouvertures', result.openApplication])
    global.addRow([])
  })

  await getUserClass(account, query).then((results) => {
    global.addRow(['Nombre d\'appels API par catégorie d\'utilisateur'])
    for (const item of results) {
      global.addRow([userClasses[item._id as keyof typeof userClasses], item.nbRequests])
    }
  })

  await workbook.commit()
}

export default generate
