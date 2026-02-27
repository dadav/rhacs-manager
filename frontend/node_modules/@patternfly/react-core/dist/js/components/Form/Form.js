"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Form = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const form_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Form/form"));
const react_styles_1 = require("@patternfly/react-styles");
const c_form_m_limit_width_MaxWidth_1 = tslib_1.__importDefault(require('@patternfly/react-tokens/dist/js/c_form_m_limit_width_MaxWidth'));
const FormBase = (_a) => {
    var { children = null, className = '', isHorizontal = false, isWidthLimited = false, maxWidth = '', innerRef } = _a, props = tslib_1.__rest(_a, ["children", "className", "isHorizontal", "isWidthLimited", "maxWidth", "innerRef"]);
    return ((0, jsx_runtime_1.jsx)("form", Object.assign({ noValidate: true }, (maxWidth && {
        style: Object.assign({ [c_form_m_limit_width_MaxWidth_1.default.name]: maxWidth }, props.style)
    }), props, { className: (0, react_styles_1.css)(form_1.default.form, isHorizontal && form_1.default.modifiers.horizontal, (isWidthLimited || maxWidth) && form_1.default.modifiers.limitWidth, className), ref: innerRef, children: children })));
};
exports.Form = (0, react_1.forwardRef)((props, ref) => (0, jsx_runtime_1.jsx)(FormBase, Object.assign({ innerRef: ref }, props)));
exports.Form.displayName = 'Form';
//# sourceMappingURL=Form.js.map