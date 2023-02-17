import config from 'config'
import { type FromSchema } from 'json-schema-to-ts'
import Ajv from 'ajv'
import * as types from '~/types'

const ajv = new Ajv()

const configSchema = {
  type: 'object',
  title: 'the configuration of the service @data-fair/metrics:api',
  required: ['port', 'publicUrl', 'directoryUrl', 'mongoUrl'],
  additionalProperties: false,
  properties: {
    port: { type: 'integer' },
    publicUrl: { type: 'string' },
    directoryUrl: { type: 'string' },
    mongoUrl: { type: 'string' },
    util: {},
    get: {},
    has: {}
  }
} as const

export type Config = FromSchema<typeof configSchema>

config.util.makeImmutable(config)
const typedConfig = types.validateThrow<Config>(ajv.compile(configSchema), config, 'en', 'config')
export default typedConfig
