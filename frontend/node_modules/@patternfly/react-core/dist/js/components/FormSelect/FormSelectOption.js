"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormSelectOption = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const FormSelectOption = (_a) => {
    var { className = '', value = '', isDisabled = false, label, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isPlaceholder = false } = _a, props = tslib_1.__rest(_a, ["className", "value", "isDisabled", "label", "isPlaceholder"]);
    return ((0, jsx_runtime_1.jsx)("option", Object.assign({}, props, { className: className, value: value, disabled: isDisabled, children: label })));
};
exports.FormSelectOption = FormSelectOption;
exports.FormSelectOption.displayName = 'FormSelectOption';
//# sourceMappingURL=FormSelectOption.js.map