"use strict";
/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */
exports.__esModule = true;
exports.listResponseSchema = void 0;
exports.listResponseSchema = {
    "$id": "list-response/schema.json",
    "title": "list-response",
    "type": "object",
    "additionalProperties": false,
    "required": [
        "count",
        "results"
    ],
    "properties": {
        "count": {
            "type": "integer"
        },
        "results": {
            "type": "array",
            "items": {
                "$ref": "daily-api-metric/schema.json"
            }
        }
    }
};
