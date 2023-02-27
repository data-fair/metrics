import config from 'config'
import { type FromSchema } from 'json-schema-to-ts'
import Ajv from 'ajv'
import { validateThrow } from '@data-fair/lib/express/req'

const ajv = new Ajv({ coerceTypes: 'array' })

const configSchema = {
  type: 'object',
  title: 'the configuration of the service @data-fair/metrics:api',
  required: ['port', 'publicUrl', 'directoryUrl', 'mongoUrl', 'prometheus'],
  additionalProperties: false,
  properties: {
    port: { type: 'integer' },
    publicUrl: { type: 'string' },
    directoryUrl: { type: 'string' },
    mongoUrl: { type: 'string' },
    prometheus: {
      type: 'object',
      required: ['active', 'port'],
      properties: {
        active: {
          type: 'boolean'
        },
        port: {
          type: 'integer'
        }
      }
    },
    util: {},
    get: {},
    has: {}
  }
} as const

export type Config = FromSchema<typeof configSchema>

config.util.makeImmutable(config)
const typedConfig = validateThrow<Config>(ajv.compile(configSchema), config, 'en', 'config', true)
export default typedConfig
