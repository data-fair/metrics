import { type FromSchema } from 'json-schema-to-ts'

const operationTrack = {
  type: 'string',
  enum: ['readDataFiles', 'readDataAPI', 'openApplication']
} as const

const statusClass = {
  type: 'string',
  enum: ['info', 'ok', 'redirect', 'clientError', 'serverError']
} as const

const userClass = {
  type: 'string',
  enum: ['anonymous', 'owner', 'external', 'ownerAPIKey', 'externalAPIKey', 'ownerProcessing', 'externalProcessing']
} as const

const dailyApiMetricSchema = {
  type: 'object',
  additionalProperties: false,
  title: 'a single daily metric',
  required: ['day', 'resource', 'operationTrack', 'statusClass', 'userClass', 'refererDomain', 'refererApp', 'nbRequests', 'bytes', 'duration'],
  properties: {
    day: {
      type: 'string',
      format: 'date'
    },
    resource: {
      type: 'object',
      additionalProperties: false,
      required: ['type', 'id'],
      properties: {
        type: {
          type: 'string'
        },
        id: {
          type: 'string'
        },
        title: {
          type: 'string'
        }
      }
    },
    operationTrack,
    statusClass,
    userClass,
    refererDomain: {
      type: 'string'
    },
    refererApp: {
      type: 'string'
    },
    processing: {
      type: 'string'
    },
    nbRequests: {
      type: 'integer',
      default: 0
    },
    bytes: {
      type: 'integer',
      default: 0
    },
    duration: {
      type: 'integer',
      default: 0
    }
  }
} as const
export type DailyApiMetrics = FromSchema<typeof dailyApiMetricSchema>

export const listResponseSchema = {
  type: 'object',
  additionalProperties: false,
  title: 'the response of the /daily-api-metrics endpoint',
  required: ['count', 'results'],
  properties: {
    count: {
      type: 'integer'
    },
    results: {
      type: 'array',
      items: dailyApiMetricSchema
    }
  }
} as const
export type ListResponse = FromSchema<typeof listResponseSchema>

export const aggQuerySchema = {
  type: 'object',
  additionalProperties: false,
  title: 'the query parameters of the /daily-api-metrics/_agg endpoint',
  required: ['start', 'end'],
  properties: {
    start: {
      type: 'string',
      format: 'date'
    },
    end: {
      type: 'string',
      format: 'date'
    },
    operationTrack,
    statusClass,
    userClass,
    split: {
      type: 'array',
      items: { type: 'string', enum: ['day', 'refererApp', 'processing', 'resource'] }
    }
  }
} as const
export type AggQuery = FromSchema<typeof aggQuerySchema>
