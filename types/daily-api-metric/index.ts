/**
 * This interface was referenced by `DailyApiMetric`'s JSON-Schema
 * via the `definition` "operationTrack".
 */
export type OperationTrack = "readDataFiles" | "readDataAPI" | "openApplication";
/**
 * This interface was referenced by `DailyApiMetric`'s JSON-Schema
 * via the `definition` "statusClass".
 */
export type StatusClass = "info" | "ok" | "redirect" | "clientError" | "serverError";
/**
 * This interface was referenced by `DailyApiMetric`'s JSON-Schema
 * via the `definition` "userClass".
 */
export type UserClass =
  | "anonymous"
  | "owner"
  | "external"
  | "ownerAPIKey"
  | "externalAPIKey"
  | "ownerProcessing"
  | "externalProcessing";

export interface DailyApiMetric {
  owner?: Account;
  day: string;
  resource: Resource;
  operationTrack: OperationTrack;
  statusClass: StatusClass;
  userClass: UserClass;
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
