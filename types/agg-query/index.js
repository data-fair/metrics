"use strict";
exports.__esModule = true;
// validate function compiled using ajv
// @ts-ignore
var validate_js_1 = require("./validate.js");
var validation_1 = require("@data-fair/lib/types/validation");
exports.validate = function (data, lang, name, internal) {
    if (lang === void 0) { lang = 'fr'; }
    if (name === void 0) { name = 'data'; }
    return validation_1.validateThrow(validate_js_1["default"], data, lang, name, internal);
};
