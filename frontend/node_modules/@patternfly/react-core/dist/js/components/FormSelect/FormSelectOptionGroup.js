"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormSelectOptionGroup = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const FormSelectOptionGroup = (_a) => {
    var { children = null, className = '', isDisabled = false, label } = _a, props = tslib_1.__rest(_a, ["children", "className", "isDisabled", "label"]);
    return ((0, jsx_runtime_1.jsx)("optgroup", Object.assign({}, props, { disabled: !!isDisabled, className: className, label: label, children: children })));
};
exports.FormSelectOptionGroup = FormSelectOptionGroup;
exports.FormSelectOptionGroup.displayName = 'FormSelectOptionGroup';
//# sourceMappingURL=FormSelectOptionGroup.js.map