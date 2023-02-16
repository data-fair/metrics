/* eslint-disable @typescript-eslint/no-var-requires */

// we use ajv both as a validation tool and as a type guard so that we have properly typed data post-validation

import Ajv, { type ValidateFunction } from 'ajv'
import ajvErrors from 'ajv-errors'
import { type Localize } from 'ajv-i18n/localize/types'
import ajvFr from 'ajv-i18n/localize/fr'
import ajvEn from 'ajv-i18n/localize/en'
import { type Config } from 'types/config'

export const ajv = new Ajv({ coerceTypes: 'array', useDefaults: 'empty', allErrors: true })

// use ajv utils to improve error messages
ajvErrors(ajv)
const localize: Record<string, Localize> = {
  fr: ajvFr,
  en: ajvEn
}

class ValidationError extends Error {
  code: string
  constructor (message: string, code: string) {
    super(message)
    this.name = `ValidationError(${code})`
    this.code = code
  }
}

const validateThrow = (validate: ValidateFunction, data: any, lang: string, code: string) => {
  if (!validate(data)) {
    (localize[lang] || localize.fr)(validate.errors)
    const message = ajv.errorsText(validate.errors, { separator: '\n', dataVar: code })
    throw new ValidationError(message, code)
  }
  return data
}

const validateConfig = ajv.compile(require('types/config/config.schema'))
export const config = {
  validate: (data: any, lang?: string) => validateThrow(validateConfig, data, lang ?? 'fr', 'config') as Config
}

// ajv.addSchema(require('../types/daily-api-metrics/agg-params.schema'), 'daily-api-metrics/agg-params')
