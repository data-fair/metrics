"use strict";
exports.__esModule = true;
// stringify function compiled using fast-json-stringify
// @ts-ignore
var stringify_js_1 = require("./stringify.js");
// @ts-ignore
var flatstr_1 = require("flatstr");
exports.stringify = function (data) {
    var str = stringify_js_1["default"](data);
    flatstr_1["default"](str);
    return str;
};
