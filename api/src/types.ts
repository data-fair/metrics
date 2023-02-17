/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-var-requires */

// we use ajv both as a validation tool and as a type check so that we have properly typed data post-validation

import { type Request, type Response } from 'express'
import Ajv, { type ValidateFunction } from 'ajv'
import AjvJtd from 'ajv/dist/jtd'
import ajvErrors from 'ajv-errors'
import { type Localize } from 'ajv-i18n/localize/types'
import ajvFr from 'ajv-i18n/localize/fr'
import ajvEn from 'ajv-i18n/localize/en'
import { schema2td } from '@koumoul/schema-jtd/schema2td'

// for responses removeAdditional=all is nice, it performs cleanup for us and ensure curated outputs
// for bodies and queries it is better to break and help the user fix his request with a message
// strong coercion on queries is good to help finishing the parsing of the querystring but discourage on body and response where the payload should be strictly valid
// useDefaults is debatable, but extenive usage of it allows for simpler conditionals in code both on the client and server
export const ajvQueries = new Ajv({ useDefaults: 'empty', coerceTypes: 'array' })
export const ajvBodies = new Ajv({ useDefaults: true })
export const ajvResponses = new Ajv({ useDefaults: true, removeAdditional: true })
export const ajvJtd = new AjvJtd()

// use ajv utils to improve error messages
ajvErrors(ajvQueries)
ajvErrors(ajvBodies)
ajvErrors(ajvResponses)
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

export const validateThrow = <Type>(validate: ValidateFunction, data: any, lang: string, code: string, status: number = 400): Type => {
  if (!validate(data)) {
    (localize[lang] || localize.fr)(validate.errors)
    const message = ajvQueries.errorsText(validate.errors, { separator: '\n', dataVar: code })
    throw new ValidationError(message, code)
  }
  return data as Type
}

const validateEmptyQuery = ajvQueries.compile({ type: 'object', properties: {}, additionalProperties: false })
// prepare a function with generic types and schemas for query/body/response
// the returned function will be used on req/res and return type checked and valid query object, body object and send method
export const reqBuilder = <QueryType = null, BodyType = null, ResponseType = any>(querySchema?: any, bodySchema?: any, responseSchema?: any) => {
  const validateQuery = querySchema ? ajvQueries.compile(querySchema) : null
  const validateBody = bodySchema ? ajvBodies.compile(bodySchema) : null
  const validateResponse = responseSchema ? ajvResponses.compile(responseSchema) : null
  const serializeResponse = responseSchema ? ajvJtd.compileSerializer(schema2td(responseSchema, { ajv: ajvResponses })) : null
  return (req: Request, res: Response): { query: QueryType, body: BodyType, send: (response: ResponseType) => void } => {
    let query = null
    if (!validateQuery) validateThrow(validateEmptyQuery, req.query, req.session.lang ?? 'fr', 'query')
    else query = <QueryType>validateThrow(validateQuery, req.query, req.session.lang ?? 'fr', 'query')
    if (!validateBody && req.body) throw new ValidationError('body schema is missing', req.route)
    const body = validateBody ? <BodyType>validateThrow(validateBody, req.body, req.session.lang ?? 'fr', 'body') : null
    const send = (response: ResponseType) => {
      if (validateResponse) validateThrow(validateResponse, response, 'en', 'response', 500)
      if (serializeResponse) {
        res.type('json')
        res.send(serializeResponse(response))
      } else {
        res.send(response)
      }
    }
    return { query: query as QueryType, body: body as BodyType, send }
  }
}
