export interface AggQuery {
    start: string;
    end: string;
    operationTrack?: "readDataFiles" | "readDataAPI" | "openApplication";
    statusClass?: "info" | "ok" | "redirect" | "clientError" | "serverError";
    userClass?: "anonymous" | "owner" | "external" | "ownerAPIKey" | "externalAPIKey" | "ownerProcessing" | "externalProcessing";
    split?: ("day" | "refererApp" | "processing" | "resource")[];
}
export declare const validate: (data: any, lang?: string, name?: string, internal?: boolean) => AggQuery;
