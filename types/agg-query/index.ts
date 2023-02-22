export interface AggQuery {
  start: string;
  end: string;
  operationTrack?: "readDataFiles" | "readDataAPI" | "openApplication";
  statusClass?: "info" | "ok" | "redirect" | "clientError" | "serverError";
  userClass?:
    | "anonymous"
    | "owner"
    | "external"
    | "ownerAPIKey"
    | "externalAPIKey"
    | "ownerProcessing"
    | "externalProcessing";
  split?: ("day" | "refererApp" | "processing" | "resource")[];
}

// validate function compiled using ajv
// @ts-ignore
import validateUnsafe from './validate.js'
import { validateThrow } from '@data-fair/lib/types/validation'
import { type ValidateFunction } from 'ajv'
export const validate = (data: any, lang: string = 'fr', name: string = 'data', internal?: boolean): AggQuery => {
  return validateThrow<AggQuery>(validateUnsafe as unknown as ValidateFunction, data, lang, name, internal)
}
        