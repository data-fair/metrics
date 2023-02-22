export interface AggResult {
  nbRequests: number;
  bytes: number;
  days?: string[];
  series: AggResultSeries[];
}
/**
 * This interface was referenced by `AggResult`'s JSON-Schema
 * via the `definition` "aggResultSeries".
 */
export interface AggResultSeries {
  key: {
    [k: string]: unknown;
  };
  nbRequests: number;
  bytes: number;
  days?: {
    [k: string]: unknown;
  };
}

// stringify function compiled using fast-json-stringify
// @ts-ignore
import stringifyUnsafe from './stringify.js'
// @ts-ignore
import flatstr from 'flatstr'
export const  stringify = (data: AggResult): string => {
  const str = stringifyUnsafe(data)
  flatstr(str)
  return str
}
        