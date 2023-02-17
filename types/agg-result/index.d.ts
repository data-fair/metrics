/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */
export interface AggResult {
    nbRequests: number;
    bytes: number;
    days?: string[];
    series: AggResultSeries[];
}
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
export declare const aggResultSchema: {
    type: string;
    additionalProperties: boolean;
    required: string[];
    properties: {
        nbRequests: {
            type: string;
        };
        bytes: {
            type: string;
        };
        days: {
            type: string;
            items: {
                type: string;
                format: string;
            };
        };
        series: {
            type: string;
            items: {
                $ref: string;
            };
        };
    };
    definitions: {
        aggResultSeries: {
            type: string;
            additionalProperties: boolean;
            required: string[];
            properties: {
                key: {
                    type: string;
                };
                nbRequests: {
                    type: string;
                };
                bytes: {
                    type: string;
                };
                days: {
                    type: string;
                    items: {
                        type: string;
                        additionalProperties: boolean;
                        patternProperties: {
                            "[0-9-]+": {
                                type: string;
                                required: string[];
                                properties: {
                                    nbRequests: {
                                        type: string;
                                    };
                                    bytes: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
    };
};
