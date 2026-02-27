"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormGroup = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const form_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Form/form"));
const htmlConstants_1 = require("../../helpers/htmlConstants");
const react_styles_1 = require("@patternfly/react-styles");
const GenerateId_1 = require("../../helpers/GenerateId/GenerateId");
const FormGroup = (_a) => {
    var { children = null, className = '', label, labelInfo, labelHelp, isRequired = false, isInline = false, hasNoPaddingTop = false, isStack = false, fieldId, role } = _a, props = tslib_1.__rest(_a, ["children", "className", "label", "labelInfo", "labelHelp", "isRequired", "isInline", "hasNoPaddingTop", "isStack", "fieldId", "role"]);
    const isGroupOrRadioGroup = role === 'group' || role === 'radiogroup';
    const LabelComponent = isGroupOrRadioGroup ? 'span' : 'label';
    const labelContent = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(LabelComponent, Object.assign({ className: (0, react_styles_1.css)(form_1.default.formLabel) }, (!isGroupOrRadioGroup && { htmlFor: fieldId }), { children: [(0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(form_1.default.formLabelText), children: label }), isRequired && ((0, jsx_runtime_1.jsxs)("span", { className: (0, react_styles_1.css)(form_1.default.formLabelRequired), "aria-hidden": "true", children: [' ', htmlConstants_1.ASTERISK] }))] })), (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: "\u00A0\u00A0" }), (0, react_1.isValidElement)(labelHelp) && (0, jsx_runtime_1.jsx)("span", { className: form_1.default.formGroupLabelHelp, children: labelHelp })] }));
    return ((0, jsx_runtime_1.jsx)(GenerateId_1.GenerateId, { children: (randomId) => ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(form_1.default.formGroup, className) }, (role && { role }), (isGroupOrRadioGroup && { 'aria-labelledby': `${fieldId || randomId}-legend` }), props, { children: [label && ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(form_1.default.formGroupLabel, labelInfo && form_1.default.modifiers.info, hasNoPaddingTop && form_1.default.modifiers.noPaddingTop) }, (isGroupOrRadioGroup && { id: `${fieldId || randomId}-legend` }), { children: [labelInfo && ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(form_1.default.formGroupLabelMain), children: labelContent }), (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(form_1.default.formGroupLabelInfo), children: labelInfo })] })), !labelInfo && labelContent] }))), (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(form_1.default.formGroupControl, isInline && form_1.default.modifiers.inline, isStack && form_1.default.modifiers.stack), children: children })] }))) }));
};
exports.FormGroup = FormGroup;
exports.FormGroup.displayName = 'FormGroup';
//# sourceMappingURL=FormGroup.js.map