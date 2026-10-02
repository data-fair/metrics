/**
 * The OpenAPI document of this service, served at /metrics/api/api-docs.json.
 *
 * The x-agent annotations turn it into agent tools through `@data-fair/openapi-mcp`
 * (vocabulary: docs/x-agent.md in that project). data-fair lists this document in its
 * deployment index (/data-fair/api/v1/agents/index.json) when its metrics integration is
 * configured, so agents of the deployment can review the audience of the active account.
 *
 * The agent-facing surface these produce is pinned by test-it/fixtures/agent-surface.explore.json.
 */
import type { AgentRoot, AgentOperation } from '@data-fair/openapi-mcp'
import dailyApiMetricSchema from '../types/daily-api-metric/schema.json' with { type: 'json' }
import aggRowsResultSchema from '../doc/agg-rows-result/schema.json' with { type: 'json' }
import aggQuerySchema from '../doc/agg-query/schema.json' with { type: 'json' }

const defs = dailyApiMetricSchema.$defs
const splitValues = aggQuerySchema.properties.split.items.enum

// the schema files are standalone JSON schemas, their local refs are resolved here for the OpenAPI document
const { $id, $defs: rowsDefs, 'x-exports': _, ...aggRowsResult } = aggRowsResultSchema
aggRowsResult.properties = { ...aggRowsResult.properties, results: { type: 'array', items: rowsDefs.aggRow } as any }

const workflow = `You are reviewing the audience of the active account's resources (datasets and applications) through the metrics service. Metrics are counts of HTTP requests, aggregated per day (UTC dates, the current day is partial).

1. **metrics_aggregate_requests** with only start/end and split [] gives the totals of the period. Then split by "operationTrack" to see what kind of usage it is, by "resource" to find the most used datasets and applications, by "userClass" or "refererCategory" to see who consumes them and from where.
2. Add "day" to split for a time series, e.g. ["day", "operationTrack"]. Keep periods short with a day split, the number of rows grows with every dimension.
3. To compare with a previous period, call the tool again with the same filters on the preceding dates.

Dimensions:
- operationTrack: readDataAPI = calls to the data API of a dataset (lines, aggregations, etc.), readDataFiles = downloads of a dataset's files, openApplication = openings of an application.
- statusClass: ok = successful responses; filter on "ok" to measure real audience, look at clientError/serverError to diagnose problems.
- userClass: anonymous = not authenticated, owner = members of the owner account, external = other authenticated users, ownerAPIKey/externalAPIKey = API keys of the owner or of another account, ownerProcessing/externalProcessing = data processings.
- refererCategory: backoffice = the data-fair back-office, embed = an embedded dataset view, app = a data-fair application, mcp = an AI agent through MCP, other = any other site or no referer. refererDomain is the domain of the calling site.
- resource: resourceType is "datasets" or "applications", resourceId can be used with the data-fair tools (datafair_describe_dataset).

Always state the period you looked at. Answer in the user's language.`

export const root: AgentRoot = {
  namePrefix: 'metrics_',
  profiles: {
    explore: {
      title: { en: 'Explore', fr: 'Explorer' },
      description: { en: 'Read-only tools: review the audience of the account\'s datasets and applications.', fr: 'Outils en lecture seule : analyser l\'audience des jeux de données et applications du compte.' }
    }
  },
  skills: [{
    name: 'metrics-review',
    description: workflow,
    profiles: ['explore'],
    tools: ['metrics_aggregate_requests']
  }]
}

export const aggregateRequests: AgentOperation = {
  profiles: ['explore'],
  name: 'aggregate_requests',
  title: { en: 'Aggregate requests metrics', fr: 'Agréger les métriques de requêtes' },
  description: 'Count the HTTP requests received by the active account\'s datasets and applications over a period, filtered and grouped by the dimensions given in split. Returns one row per group with nbRequests, bytes and meanDuration (seconds), sorted by day then by number of requests.',
  params: {
    start: { description: 'First day of the period, format YYYY-MM-DD.' },
    end: { description: 'Last day of the period (included), format YYYY-MM-DD.' },
    split: {
      description: 'Dimensions to group by, as an array. Example: ["resource"] for the most used resources, ["day", "operationTrack"] for a time series per kind of usage, [] for the totals of the period. Omitted means ["day"].'
    },
    resourceId: { description: 'Restrict to some resources, as an array of dataset or application ids. Combine with resourceType.' },
    size: { default: 100, maximum: 1000, description: 'Maximum number of rows. The response count says how many groups exist in total.' }
  },
  fixed: { format: 'rows' },
  response: { rows: '/results' }
}

const arrayParam = (name: string, items: Record<string, unknown>, description: string) => ({
  in: 'query',
  name,
  description,
  required: false,
  style: 'form',
  explode: true,
  schema: { type: 'array', items }
})

export default (publicUrl: string) => ({
  openapi: '3.1.0',
  info: {
    title: 'API Metrics',
    description: 'Audience metrics of the data-fair resources (datasets and applications) owned by the active account: HTTP requests aggregated per day.',
    version: '1.0.0'
  },
  'x-agent': root,
  servers: [{ url: `${publicUrl}/api` }],
  components: {
    securitySchemes: {
      sdCookie: { type: 'apiKey', in: 'cookie', name: 'id_token' }
    },
    schemas: {
      aggRowsResult
    }
  },
  security: [{ sdCookie: [] }],
  tags: [{ name: 'Metrics', description: 'Daily aggregated metrics of HTTP requests.' }],
  paths: {
    '/daily-api-metrics/_agg': {
      get: {
        operationId: 'aggDailyApiMetrics',
        summary: 'Aggregate daily metrics',
        description: 'Aggregate the daily metrics of the active account over a period, filtered and split by dimensions.',
        tags: ['Metrics'],
        'x-agent': aggregateRequests,
        parameters: [
          { in: 'query', name: 'start', required: true, description: 'First day of the period.', schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'end', required: true, description: 'Last day of the period (included).', schema: { type: 'string', format: 'date' } },
          {
            in: 'query',
            name: 'split',
            required: false,
            description: 'Dimensions to group by. Defaults to day.',
            style: 'form',
            explode: false,
            schema: { type: 'array', items: { type: 'string', enum: splitValues } }
          },
          { in: 'query', name: 'operationTrack', required: false, description: 'Kind of operation.', schema: defs.operationTrack },
          { in: 'query', name: 'statusClass', required: false, description: 'Class of the HTTP response status.', schema: defs.statusClass },
          arrayParam('userClass', defs.userClass, 'Classes of users.'),
          { in: 'query', name: 'resourceType', required: false, description: 'Type of resource.', schema: { type: 'string', enum: ['datasets', 'applications'] } },
          arrayParam('resourceId', { type: 'string' }, 'Resource ids.'),
          arrayParam('refererDomain', { type: 'string' }, 'Domains of the calling sites.'),
          arrayParam('refererCategory', defs.refererCategory, 'Categories of the calling sites.'),
          { in: 'query', name: 'format', required: false, description: 'series (default) groups values by key with a nested day map, rows returns one flat row per group.', schema: { type: 'string', enum: ['series', 'rows'], default: 'series' } },
          { in: 'query', name: 'size', required: false, description: 'Maximum number of rows when format=rows.', schema: { type: 'integer', minimum: 1, maximum: 10000, default: 1000 } }
        ],
        responses: {
          200: {
            description: 'The aggregation result, as rows when format=rows.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/aggRowsResult' } } }
          }
        }
      }
    },
    '/daily-api-metrics/_export': {
      get: {
        operationId: 'exportDailyApiMetrics',
        summary: 'Export metrics as a spreadsheet',
        tags: ['Metrics'],
        parameters: [
          { in: 'query', name: 'start', required: true, schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'end', required: true, schema: { type: 'string', format: 'date' } }
        ],
        responses: {
          200: {
            description: 'An XLSX workbook.',
            content: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { schema: { type: 'string', format: 'binary' } } }
          }
        }
      }
    }
  }
})
