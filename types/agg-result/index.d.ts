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
export declare const stringify: (data: AggResult) => string;
