import type { Account } from '@data-fair/lib-express'
import type { Response } from 'express'
import type { ExportQuery } from '#doc'

import Excel from 'exceljs'
import dayjs from 'dayjs'
import { getApp, getDataset, getHistory, getOrigin, getTotal, getUserClass } from './service.ts'
import { t } from '../../i18n/utils.ts'

const userClassKeys = ['anonymous', 'owner', 'external', 'ownerAPIKey', 'externalAPIKey'] as const
type UserClassKey = typeof userClassKeys[number]

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
  nbFilesAnonymous: number
  nbFilesOwner: number
  nbFilesExternal: number
}

// Default palette used when the site theme is unavailable. Aligned with
// @data-fair/lib-vuetify baseColors so the export matches the UI defaults.
const DEFAULT_COLORS = {
  PRIMARY: '1E88E5',
  ON_PRIMARY: 'FFFFFF',
  SUCCESS: '4CAF50',
  ON_SUCCESS: 'FFFFFF',
  ERROR: 'FF5252',
  ON_ERROR: 'FFFFFF',
  ACCENT: 'FF9800',
  ON_ACCENT: 'FFFFFF'
}

// ExcelJS uses ARGB hex without a leading "#"; theme colors come from
// simple-directory as "#RRGGBB", so we strip the prefix and uppercase.
const argb = (hex: string | undefined, fallback: string) => {
  if (!hex) return fallback
  return hex.replace(/^#/, '').toUpperCase()
}

const resolveColors = (themeColors?: Record<string, string>) => ({
  PRIMARY: argb(themeColors?.primary, DEFAULT_COLORS.PRIMARY),
  ON_PRIMARY: argb(themeColors?.['on-primary'], DEFAULT_COLORS.ON_PRIMARY),
  SUCCESS: argb(themeColors?.success, DEFAULT_COLORS.SUCCESS),
  ON_SUCCESS: argb(themeColors?.['on-success'], DEFAULT_COLORS.ON_SUCCESS),
  ERROR: argb(themeColors?.error, DEFAULT_COLORS.ERROR),
  ON_ERROR: argb(themeColors?.['on-error'], DEFAULT_COLORS.ON_ERROR),
  ACCENT: argb(themeColors?.accent, DEFAULT_COLORS.ACCENT),
  ON_ACCENT: argb(themeColors?.['on-accent'], DEFAULT_COLORS.ON_ACCENT)
})

type Palette = ReturnType<typeof resolveColors>

// Helper functions for worksheet setup
const setupWorksheets = (workbook: Excel.stream.xlsx.WorkbookWriter, query: { start: string, end: string }, lang: string | undefined) => {
  workbook.creator = 'Data-Fair'
  workbook.created = new Date()

  const userClass = (key: UserClassKey) => t(lang, `export.userClasses.${key}`)
  const apiCallsBy = (key: UserClassKey) => t(lang, 'export.columns.apiCallsBy', { userClass: userClass(key) })
  const downloadsBy = (key: UserClassKey) => t(lang, 'export.columns.downloadsBy', { userClass: userClass(key) })

  const global = workbook.addWorksheet(t(lang, 'export.sheets.global'))
  global.getColumn(1).width = 4
  global.getColumn(2).width = 30
  global.getColumn(3).width = 18
  global.getColumn(4).width = 18
  global.getColumn(5).width = 10
  global.addRow([])
  global.addRow([
    '',
    t(lang, 'export.global.periodRange', { start: formatDate(query.start), end: formatDate(query.end) }),
    t(lang, 'export.global.currentPeriod'),
    t(lang, 'export.global.previousPeriod'),
    t(lang, 'export.global.variation')
  ])

  const history = workbook.addWorksheet(t(lang, 'export.sheets.history'))
  history.columns = [
    { header: t(lang, 'export.columns.date'), key: 'day', width: 15 },
    { header: t(lang, 'export.columns.totalApiCalls'), key: 'nbRequests', width: 25 },
    { header: t(lang, 'export.columns.totalDownloads'), key: 'nbFiles', width: 25 },
    { header: apiCallsBy('owner'), key: 'nbRequestsOwner', width: 30 },
    { header: apiCallsBy('external'), key: 'nbRequestsExternal', width: 30 },
    { header: apiCallsBy('anonymous'), key: 'nbRequestsAnonymous', width: 30 },
    { header: apiCallsBy('ownerAPIKey'), key: 'nbRequestsOwnerAPIKey', width: 30 },
    { header: apiCallsBy('externalAPIKey'), key: 'nbRequestsExternalAPIKey', width: 30 },
    { header: downloadsBy('owner'), key: 'nbFilesOwner', width: 30 },
    { header: downloadsBy('external'), key: 'nbFilesExternal', width: 30 },
    { header: downloadsBy('anonymous'), key: 'nbFilesAnonymous', width: 30 }
  ]

  const dataset = workbook.addWorksheet(t(lang, 'export.sheets.datasets'))
  dataset.columns = [
    { header: t(lang, 'export.columns.id'), key: 'id', width: 28 },
    { header: t(lang, 'export.columns.title'), key: 'title', width: 40 },
    { header: t(lang, 'export.columns.totalApiCalls'), key: 'nbRequests', width: 25 },
    { header: t(lang, 'export.columns.totalDownloads'), key: 'nbFiles', width: 25 },
    { header: apiCallsBy('owner'), key: 'nbRequestsOwner', width: 30 },
    { header: apiCallsBy('external'), key: 'nbRequestsExternal', width: 30 },
    { header: apiCallsBy('anonymous'), key: 'nbRequestsAnonymous', width: 30 },
    { header: apiCallsBy('ownerAPIKey'), key: 'nbRequestsOwnerAPIKey', width: 30 },
    { header: apiCallsBy('externalAPIKey'), key: 'nbRequestsExternalAPIKey', width: 30 },
    { header: downloadsBy('owner'), key: 'nbFilesOwner', width: 30 },
    { header: downloadsBy('external'), key: 'nbFilesExternal', width: 30 },
    { header: downloadsBy('anonymous'), key: 'nbFilesAnonymous', width: 30 }
  ]

  const topic = workbook.addWorksheet(t(lang, 'export.sheets.topicsApi'))
  topic.columns = [
    { header: t(lang, 'export.columns.topic'), key: 'topic', width: 30 },
    { header: t(lang, 'export.columns.allUsers'), key: 'nbRequests', width: 20 },
    { header: userClass('owner'), key: 'nbRequestsOwner', width: 20 },
    { header: userClass('external'), key: 'nbRequestsExternal', width: 20 },
    { header: userClass('anonymous'), key: 'nbRequestsAnonymous', width: 20 },
    { header: userClass('ownerAPIKey'), key: 'nbRequestsOwnerAPIKey', width: 20 },
    { header: userClass('externalAPIKey'), key: 'nbRequestsExternalAPIKey', width: 20 }
  ]

  const origin = workbook.addWorksheet(t(lang, 'export.sheets.originsApi'))
  origin.columns = [
    { header: t(lang, 'export.columns.origin'), key: 'origin', width: 30 },
    { header: t(lang, 'export.columns.allUsers'), key: 'nbRequests', width: 20 },
    { header: userClass('owner'), key: 'nbRequestsOwner', width: 20 },
    { header: userClass('external'), key: 'nbRequestsExternal', width: 20 },
    { header: userClass('anonymous'), key: 'nbRequestsAnonymous', width: 20 },
    { header: userClass('ownerAPIKey'), key: 'nbRequestsOwnerAPIKey', width: 20 },
    { header: userClass('externalAPIKey'), key: 'nbRequestsExternalAPIKey', width: 20 }
  ]

  const topicFiles = workbook.addWorksheet(t(lang, 'export.sheets.topicsFiles'))
  topicFiles.columns = [
    { header: t(lang, 'export.columns.topic'), key: 'topic', width: 30 },
    { header: t(lang, 'export.columns.allUsers'), key: 'nbFiles', width: 20 },
    { header: userClass('owner'), key: 'nbFilesOwner', width: 20 },
    { header: userClass('external'), key: 'nbFilesExternal', width: 20 },
    { header: userClass('anonymous'), key: 'nbFilesAnonymous', width: 20 }
  ]

  const originFiles = workbook.addWorksheet(t(lang, 'export.sheets.originsFiles'))
  originFiles.columns = [
    { header: t(lang, 'export.columns.origin'), key: 'origin', width: 30 },
    { header: t(lang, 'export.columns.allUsers'), key: 'nbFiles', width: 20 },
    { header: userClass('owner'), key: 'nbFilesOwner', width: 20 },
    { header: userClass('external'), key: 'nbFilesExternal', width: 20 },
    { header: userClass('anonymous'), key: 'nbFilesAnonymous', width: 20 }
  ]

  const app = workbook.addWorksheet(t(lang, 'export.sheets.apps'))
  app.columns = [
    { header: t(lang, 'export.columns.id'), key: 'id', width: 28 },
    { header: t(lang, 'export.columns.title'), key: 'title', width: 40 },
    { header: t(lang, 'export.columns.allUsers'), key: 'nbRequests', width: 20 },
    { header: userClass('owner'), key: 'nbRequestsOwner', width: 20 },
    { header: userClass('external'), key: 'nbRequestsExternal', width: 20 },
    { header: userClass('anonymous'), key: 'nbRequestsAnonymous', width: 20 }
  ]

  return { global, history, dataset, topic, origin, topicFiles, originFiles, app }
}

// Style the auto-generated header row (row 1) of a sheet built with `columns`.
const styleColumnsHeader = (sheet: Excel.Worksheet, palette: Palette) => {
  const row = sheet.getRow(1)
  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: palette.PRIMARY }
    }
    cell.font = { ...(cell.font || {}), color: { argb: palette.ON_PRIMARY }, bold: true }
    cell.border = {
      top: { style: 'medium' },
      bottom: { style: 'medium' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    }
  })
}

// Apply borders + header styling to a rectangular block. The outer border is
// medium (thicker) so the two groups stand out; inner cells use hair borders.
// Cells in the top row OR leftmost column receive a primary fill with on-primary text.
const applyBlockBordersAndFill = (
  sheet: Excel.Worksheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  palette: Palette
) => {
  const extBorder = { style: 'medium' as const }
  const intBorder = { style: 'hair' as const }

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const cell = sheet.getCell(row, col)

      cell.border = {
        top: row === startRow ? extBorder : intBorder,
        bottom: row === endRow ? extBorder : intBorder,
        left: col === startCol ? extBorder : intBorder,
        right: col === endCol ? extBorder : intBorder
      }

      if (row === startRow || col === startCol) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: palette.PRIMARY }
        }
        cell.font = { ...(cell.font || {}), color: { argb: palette.ON_PRIMARY }, bold: true }
      }
    }
  }
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
    stats.nbFilesOwner += datasetMetrics.nbFilesOwner || 0
    stats.nbFilesExternal += datasetMetrics.nbFilesExternal || 0
    stats.nbFilesAnonymous += datasetMetrics.nbFilesAnonymous || 0
  }
}

const generate = async (
  account: Account,
  lang: string | undefined,
  query: ExportQuery,
  datasetsRes: Dataset[],
  applicationsRes: Application[],
  topics: Topic[],
  baseUrl: string,
  themeColors: Record<string, string> | undefined,
  res: Response
) => {
  const palette = resolveColors(themeColors)
  const datasetIds = datasetsRes.map(dataset => dataset.id)
  const applicationIds = applicationsRes.map(application => application.id)

  // Setup Excel workbook and sheets
  const workbook = new Excel.stream.xlsx.WorkbookWriter({
    stream: res,
    useStyles: true,
    useSharedStrings: true
  })

  const { global, history, dataset, topic, origin, topicFiles, originFiles, app } = setupWorksheets(workbook, query, lang)
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
      nbRequestsExternalAPIKey: 0,
      nbFilesAnonymous: 0,
      nbFilesOwner: 0,
      nbFilesExternal: 0
    }
    return acc
  }, {} as Record<string, TopicStats>)

  // Fetch all data concurrently to improve performance
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

  // Process topics data (API calls)
  const sortedTopicsApi = Object.values(topicsStats).sort((a, b) => b.nbRequests - a.nbRequests)
  for (const item of sortedTopicsApi) {
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

  // Process topics data (downloads)
  const sortedTopicsFiles = Object.values(topicsStats).sort((a, b) => b.nbFiles - a.nbFiles)
  for (const item of sortedTopicsFiles) {
    topicFiles.addRow({
      topic: item.title,
      nbFiles: item.nbFiles,
      nbFilesOwner: item.nbFilesOwner,
      nbFilesExternal: item.nbFilesExternal,
      nbFilesAnonymous: item.nbFilesAnonymous
    })
  }

  // Process origin data (API calls)
  for (const item of originResults) {
    origin.addRow({
      origin: item.origin === 'none' ? t(lang, 'export.misc.unknown') : item.origin,
      nbRequests: item.nbRequests,
      nbRequestsOwner: item.nbRequestsOwner,
      nbRequestsExternal: item.nbRequestsExternal,
      nbRequestsAnonymous: item.nbRequestsAnonymous,
      nbRequestsOwnerAPIKey: item.nbRequestsOwnerAPIKey,
      nbRequestsExternalAPIKey: item.nbRequestsExternalAPIKey
    })
  }

  // Process origin data (downloads)
  const sortedOriginFiles = [...originResults].sort((a, b) => (b.nbFiles || 0) - (a.nbFiles || 0))
  for (const item of sortedOriginFiles) {
    originFiles.addRow({
      origin: item.origin === 'none' ? t(lang, 'export.misc.unknown') : item.origin,
      nbFiles: item.nbFiles,
      nbFilesOwner: item.nbFilesOwner,
      nbFilesExternal: item.nbFilesExternal,
      nbFilesAnonymous: item.nbFilesAnonymous
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
        hyperlink: `${baseUrl}/data-fair/application/${application.id}`
      },
      title: application.title || '',
      nbRequests: item?.nbRequests || 0,
      nbRequestsOwner: item?.nbRequestsOwner || 0,
      nbRequestsExternal: item?.nbRequestsExternal || 0,
      nbRequestsAnonymous: item?.nbRequestsAnonymous || 0
    })
  }

  // Add global stats
  global.addRow(['', t(lang, 'export.global.apiCalls'), totalResults.current.readDataAPI, totalResults.previous.readDataAPI])
  global.addRow(['', t(lang, 'export.global.fileDownloads'), totalResults.current.readDataFiles, totalResults.previous.readDataFiles])
  global.addRow(['', t(lang, 'export.global.appViews'), totalResults.current.openApplication, totalResults.previous.openApplication])

  const variationFill = (diff: number) => ({
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: diff > 0 ? palette.SUCCESS : (diff < 0 ? palette.ERROR : palette.ACCENT) }
  })
  const variationFont = (diff: number) => ({
    color: { argb: diff > 0 ? palette.ON_SUCCESS : (diff < 0 ? palette.ON_ERROR : palette.ON_ACCENT) },
    bold: true
  })

  const metrics = [
    { row: 3, current: totalResults.current.readDataAPI, previous: totalResults.previous.readDataAPI },
    { row: 4, current: totalResults.current.readDataFiles, previous: totalResults.previous.readDataFiles },
    { row: 5, current: totalResults.current.openApplication, previous: totalResults.previous.openApplication }
  ]

  metrics.forEach(({ row, current, previous }) => {
    const cell = global.getCell(`E${row}`)
    const diff = current - previous
    cell.value = {
      formula: `=(C${row}-D${row})/D${row}`,
      result: previous !== 0 ? diff / previous : diff === 0 ? 0 : 1
    }

    cell.numFmt = '0.00%'
    cell.fill = variationFill(diff)
    cell.font = variationFont(diff)
  })

  applyBlockBordersAndFill(global, 2, 5, 2, 5, palette)
  global.addRow([]) // row 6 (separator)

  // Add user class stats
  const userClassHeaderRow = 7
  global.addRow(['', t(lang, 'export.global.userClassBreakdown')]) // row 7

  const userClassMap = new Map<string, { className: string, current: number, previous: number }>()
  userClassResults.current.forEach((item: { _id: string; nbRequests: any }) => {
    if (userClassKeys.includes(item._id as UserClassKey)) {
      userClassMap.set(item._id, {
        className: t(lang, `export.userClasses.${item._id}`),
        current: item.nbRequests,
        previous: 0
      })
    }
  })
  userClassResults.previous.forEach((item: { _id: string; nbRequests: any }) => {
    const existing = userClassMap.get(item._id)
    if (existing) {
      existing.previous = item.nbRequests
    } else if (userClassKeys.includes(item._id as UserClassKey)) {
      userClassMap.set(item._id, {
        className: t(lang, `export.userClasses.${item._id}`),
        current: 0,
        previous: item.nbRequests
      })
    }
  })

  let userRowIndex = userClassHeaderRow + 1
  userClassMap.forEach((data) => {
    global.addRow(['', data.className, data.current, data.previous])

    const cell = global.getCell(`E${userRowIndex}`)
    const diff = data.current - data.previous
    cell.value = {
      formula: `=(C${userRowIndex}-D${userRowIndex})/D${userRowIndex}`,
      result: data.previous !== 0 ? diff / data.previous : diff === 0 ? 0 : 1
    }

    cell.numFmt = '0.00%'
    cell.fill = variationFill(diff)
    cell.font = variationFont(diff)
    userRowIndex++
  })

  if (userClassMap.size > 0) {
    applyBlockBordersAndFill(global, userClassHeaderRow, userClassHeaderRow + userClassMap.size, 2, 5, palette)
  }

  // Add user class definitions block. The descriptions for `owner` and `ownerAPIKey`
  // vary depending on whether the account is an individual user or an organization.
  const accountVariant = account.type === 'organization' ? 'organization' : 'user'
  const definitionKey = (key: UserClassKey) => {
    if (key === 'owner' || key === 'ownerAPIKey') return `export.userClassDefinitions.${key}.${accountVariant}`
    return `export.userClassDefinitions.${key}`
  }
  const userClassDefinitions: [string, string][] = userClassKeys.map(key => [
    t(lang, `export.userClasses.${key}`),
    t(lang, definitionKey(key))
  ])

  const definitionsHeaderRow = userClassHeaderRow + userClassMap.size + 2
  global.addRow([]) // separator row
  global.addRow(['', t(lang, 'export.global.userClassDefinitionsTitle')])

  userClassDefinitions.forEach(([name, description], i) => {
    const rowNumber = definitionsHeaderRow + 1 + i
    global.addRow(['', name, description])
    global.getCell(`C${rowNumber}`).alignment = { wrapText: true, vertical: 'middle' }
    global.getRow(rowNumber).height = 30
  })

  // Style before merging so the master cell keeps the styling
  applyBlockBordersAndFill(global, definitionsHeaderRow, definitionsHeaderRow + userClassDefinitions.length, 2, 5, palette)

  // Patch column C's right border to medium since it becomes the rightmost visible
  // cell after the C:E merge (the medium border was originally on column E)
  for (let row = definitionsHeaderRow; row <= definitionsHeaderRow + userClassDefinitions.length; row++) {
    const cell = global.getCell(`C${row}`)
    cell.border = { ...(cell.border || {}), right: { style: 'medium' } }
  }

  global.mergeCells(`C${definitionsHeaderRow}:E${definitionsHeaderRow}`)
  userClassDefinitions.forEach((_, i) => {
    global.mergeCells(`C${definitionsHeaderRow + 1 + i}:E${definitionsHeaderRow + 1 + i}`)
  })

  // Style the column-driven sheets' header rows with the theme's primary palette.
  for (const sheet of [history, dataset, topic, origin, topicFiles, originFiles, app]) {
    styleColumnsHeader(sheet, palette)
  }

  await workbook.commit()
}

export default generate
