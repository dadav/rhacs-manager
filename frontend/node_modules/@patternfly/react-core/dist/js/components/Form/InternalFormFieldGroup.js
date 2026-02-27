"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalFormFieldGroup = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const form_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Form/form"));
const react_styles_1 = require("@patternfly/react-styles");
const FormFieldGroupToggle_1 = require("./FormFieldGroupToggle");
const helpers_1 = require("../../helpers");
const helpers_2 = require("../../helpers");
const InternalFormFieldGroup = (_a) => {
    var { children, className, header, isExpandable, isExpanded, onToggle, toggleAriaLabel, hasAnimations: hasAnimationsProp } = _a, props = tslib_1.__rest(_a, ["children", "className", "header", "isExpandable", "isExpanded", "onToggle", "toggleAriaLabel", "hasAnimations"]);
    const hasAnimations = (0, helpers_2.useHasAnimations)(hasAnimationsProp);
    const headerTitleText = header ? header.props.titleText : null;
    if (isExpandable && !toggleAriaLabel && !headerTitleText) {
        // eslint-disable-next-line no-console
        console.error('FormFieldGroupExpandable:', 'toggleAriaLabel or the titleText prop of FormFieldGroupHeader is required to make the toggle button accessible');
    }
    return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(form_1.default.formFieldGroup, isExpanded && isExpandable && form_1.default.modifiers.expanded, hasAnimations && isExpandable && form_1.default.modifiers.expandable, className), role: "group" }, (headerTitleText && { 'aria-labelledby': `${header.props.titleText.id}` }), props, { children: [isExpandable && ((0, jsx_runtime_1.jsx)(helpers_1.GenerateId, { prefix: "form-field-group-toggle", children: (id) => ((0, jsx_runtime_1.jsx)(FormFieldGroupToggle_1.FormFieldGroupToggle, Object.assign({ onToggle: onToggle, isExpanded: isExpanded, "aria-label": toggleAriaLabel, toggleId: id }, (headerTitleText && { 'aria-labelledby': `${header.props.titleText.id} ${id}` })))) })), header && header, (!isExpandable || (isExpandable && isExpanded) || (hasAnimations && isExpandable)) && ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(form_1.default.formFieldGroupBody) }, (hasAnimations && isExpandable && !isExpanded && { inert: '' }), { children: children })))] })));
};
exports.InternalFormFieldGroup = InternalFormFieldGroup;
exports.InternalFormFieldGroup.displayName = 'InternalFormFieldGroup';
//# sourceMappingURL=InternalFormFieldGroup.js.map