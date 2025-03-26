import type { Account } from '@data-fair/lib-express'
import type { Response } from 'express'

import Excel from 'exceljs'
import { agg, getHistory } from './service.ts'

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

const generate = async (account: Account, query: any, res: Response) => {
  const workbook = new Excel.stream.xlsx.WorkbookWriter({
    stream: res,
    useStyles: true,
    useSharedStrings: true
  })
  workbook.creator = 'Data-Fair'
  workbook.created = new Date()

  const global = workbook.addWorksheet('Global')

  const generatePeriodSentence = (start: string, end: string) => {
    let period = ''

    if (!start && !end) {
      period = 'depuis toujours'
    } else if (start && !end) {
      period = `à partir du ${start}`
    } else if (!start && end) {
      period = `depuis toujours jusqu'au ${end}`
    } else {
      period = `du ${start} au ${end}`
    }

    return period
  }

  const rqByUserClass = await agg(account, {
    start: query.start,
    end: query.end,
    split: ['userClass'],
    statusClass: 'ok'
  })

  global.getColumn(1).width = 40
  global.addRow(['Période sélectionnée :', generatePeriodSentence(query.start, query.end)])
  global.addRow(['Nombre de fichiers téléchargés'])
  global.addRow(['Nombre d\'appels API', rqByUserClass.nbRequests])
  global.addRow([])
  global.addRow(['Nombre d\'appels API par catégorie d\'utilisateur'])

  for (const item of rqByUserClass.series) {
    global.addRow([userClasses[item.key.userClass!] || item.key.userClass, item.nbRequests])
  }

  const historyData = await getHistory(account, {
    start: query.start,
    end: query.end,
    statusClass: 'ok',
    groupBy: 'day'
  })

  const history = workbook.addWorksheet('Historique')
  history.columns = [
    { header: 'Date', key: 'day', width: 15 },
    { header: 'Nombre d\'appels API', key: 'nbRequests', width: 20 },
    { header: 'Nombre de fichiers téléchargés', key: 'nbFiles', width: 25 }
  ]

  for (const item of historyData) {
    history.addRow([item._id, item.nbRequests, item.nbFiles])
  }

  const JDD = workbook.addWorksheet('Jeu de données')
  JDD.columns = [
    { header: 'Identifiant', key: 'id', width: 30 },
    { header: 'Titre', key: 'title', width: 40 },
    { header: 'Nombre d\'appels API', key: 'nbRequests', width: 20 },
    { header: 'Nombre de fichiers téléchargés', key: 'nbFiles', width: 25 }
  ]

  const rqByDataset = await getHistory(account, {
    start: query.start,
    end: query.end,
    groupBy: 'datasets',
    statusClass: 'ok',
  })

  for (const item of rqByDataset) {
    JDD.addRow([item._id, item.resource?.title, item.nbRequests, item.nbFiles])
  }

  const origin = workbook.addWorksheet('Origine')
  origin.columns = [
    { header: 'Origine', key: 'origin', width: 30 },
    { header: 'Nombre d\'appels API', key: 'nbRequests', width: 20 }
  ]

  const rqByOriginData = await agg(account, {
    start: query.start,
    end: query.end,
    split: ['refererDomain'],
    statusClass: 'ok'
  })

  for (const item of rqByOriginData.series) {
    origin.addRow([item.key.refererDomain === 'none' ? 'Inconnu' : item.key.refererDomain, item.nbRequests])
  }

  const visu = workbook.addWorksheet('Visualisation')
  visu.columns = [
    { header: 'Identifiant', key: 'id', width: 30 },
    { header: 'Titre', key: 'title', width: 40 },
    { header: 'Nombre d\'ouvertures', key: 'nbRequests', width: 20 }
  ]

  const rqByVisuData = await agg(account, {
    start: query.start,
    end: query.end,
    split: ['resource'],
    statusClass: 'ok',
    operationTrack: 'openApplication'
  })

  for (const item of rqByVisuData.series) {
    visu.addRow([item.key.resource?.id, item.key.resource?.title, item.nbRequests])
  }

  await workbook.commit()
}

export default generate
