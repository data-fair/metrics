export interface ListResponse {
  count: number;
  results: DailyApiMetric[];
}
export interface DailyApiMetric {
  owner?: Account;
  day: string;
  resource: Resource;
  /**
   * This interface was referenced by `DailyApiMetric`'s JSON-Schema
   * via the `definition` "operationTrack".
   */
  operationTrack: "readDataFiles" | "readDataAPI" | "openApplication";
  /**
   * This interface was referenced by `DailyApiMetric`'s JSON-Schema
   * via the `definition` "statusClass".
   */
  statusClass: "info" | "ok" | "redirect" | "clientError" | "serverError";
  /**
   * This interface was referenced by `DailyApiMetric`'s JSON-Schema
   * via the `definition` "userClass".
   */
  userClass:
    | "anonymous"
    | "owner"
    | "external"
    | "ownerAPIKey"
    | "externalAPIKey"
    | "ownerProcessing"
    | "externalProcessing";
  refererDomain: string;
  refererApp: string;
  processing?: string;
  nbRequests: number;
  bytes: number;
  duration: number;
}
export interface Account {
  type: string;
  id: string;
  name: string;
  department?: string;
  departmentName?: string;
}
/**
 * This interface was referenced by `DailyApiMetric`'s JSON-Schema
 * via the `definition` "resource".
 */
export interface Resource {
  type: string;
  id: string;
  title?: string;
}

// stringify function compiled using fast-json-stringify
// @ts-ignore
import stringifyUnsafe from './stringify.js'
// @ts-ignore
import flatstr from 'flatstr'
export const  stringify = (data: ListResponse): string => {
  const str = stringifyUnsafe(data)
  flatstr(str)
  return str
}
        