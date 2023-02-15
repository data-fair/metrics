/* eslint-disable @typescript-eslint/no-var-requires */

// we use ajv both as a validation tool and as a type guard so that we have propery typing post-validation
// both for bodies, query params, config, etc basically any payload

import Ajv, { type ValidateFunction } from 'ajv'
import createError from 'http-errors'
import { type Config } from '~/types/config'

// cf https://ajv.js.org/options.html#options-to-modify-validated-data
export const ajv = new Ajv({ coerceTypes: 'array', useDefaults: 'empty' })

// wrap ajv validation to throw http 400 errors with the most readable message possible
const localize: Record<string, any> = {
  fr: require('ajv-i18n/localize/fr'),
  en: require('ajv-i18n/localize/en')
}
const validateThrow = (validate: ValidateFunction, data: any, lang: string) => {
  if (!validate(data)) {
    ajv.errorsText(validate.errors, { separator: '\n' })
    const message = (localize[lang] || localize.fr)(validate.errors)
    throw createError(400, message)
  }
  return data
}

const validateConfig = ajv.compile(require('~/types/config/config.schema'))

export const config = (data: any, lang?: string) => validateThrow(validateConfig, data, lang ?? 'fr') as Config

// ajv.addSchema(require('../types/daily-api-metrics/agg-params.schema'), 'daily-api-metrics/agg-params')
