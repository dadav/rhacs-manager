"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressStep = exports.ProgressStepVariant = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const progress_stepper_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/ProgressStepper/progress-stepper"));
const react_styles_1 = require("@patternfly/react-styles");
const check_circle_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/check-circle-icon'));
const resources_full_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/resources-full-icon'));
const exclamation_triangle_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/exclamation-triangle-icon'));
const exclamation_circle_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/exclamation-circle-icon'));
var ProgressStepVariant;
(function (ProgressStepVariant) {
    ProgressStepVariant["default"] = "default";
    ProgressStepVariant["pending"] = "pending";
    ProgressStepVariant["success"] = "success";
    ProgressStepVariant["info"] = "info";
    ProgressStepVariant["danger"] = "danger";
    ProgressStepVariant["warning"] = "warning";
})(ProgressStepVariant || (exports.ProgressStepVariant = ProgressStepVariant = {}));
const variantIcons = {
    default: undefined,
    pending: undefined,
    success: (0, jsx_runtime_1.jsx)(check_circle_icon_1.default, {}),
    info: (0, jsx_runtime_1.jsx)(resources_full_icon_1.default, {}),
    warning: (0, jsx_runtime_1.jsx)(exclamation_triangle_icon_1.default, {}),
    danger: (0, jsx_runtime_1.jsx)(exclamation_circle_icon_1.default, {})
};
const variantStyle = {
    default: '',
    info: progress_stepper_1.default.modifiers.info,
    success: progress_stepper_1.default.modifiers.success,
    pending: progress_stepper_1.default.modifiers.pending,
    warning: progress_stepper_1.default.modifiers.warning,
    danger: progress_stepper_1.default.modifiers.danger
};
const ProgressStep = (_a) => {
    var { children, className, variant, isCurrent, description, icon, titleId, 'aria-label': ariaLabel, popoverRender } = _a, props = tslib_1.__rest(_a, ["children", "className", "variant", "isCurrent", "description", "icon", "titleId", 'aria-label', "popoverRender"]);
    const _icon = icon !== undefined ? icon : variantIcons[variant];
    const Component = popoverRender !== undefined ? 'button' : 'div';
    const stepRef = (0, react_1.useRef)(undefined);
    if (props.id === undefined || titleId === undefined) {
        /* eslint-disable no-console */
        console.warn('ProgressStep: The titleId and id properties are required to make this component accessible, and one or both of these properties are missing.');
    }
    return ((0, jsx_runtime_1.jsxs)("li", Object.assign({ className: (0, react_styles_1.css)(progress_stepper_1.default.progressStepperStep, variantStyle[variant], isCurrent && progress_stepper_1.default.modifiers.current, className), "aria-label": ariaLabel, 
        // CSS style `display: contents` gives this li a generic role, we need to override that
        role: "listitem" }, (isCurrent && { 'aria-current': 'step' }), props, { children: [(0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(progress_stepper_1.default.progressStepperStepConnector), children: (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(progress_stepper_1.default.progressStepperStepIcon), children: _icon && _icon }) }), (0, jsx_runtime_1.jsxs)("div", { className: (0, react_styles_1.css)(progress_stepper_1.default.progressStepperStepMain), children: [(0, jsx_runtime_1.jsxs)(Component, Object.assign({ className: (0, react_styles_1.css)(progress_stepper_1.default.progressStepperStepTitle, popoverRender && progress_stepper_1.default.modifiers.helpText), id: titleId, ref: stepRef }, (popoverRender && { type: 'button' }), (props.id !== undefined &&
                        titleId !== undefined &&
                        popoverRender && { 'aria-labelledby': `${props.id} ${titleId}` }), { children: [children, popoverRender && popoverRender(stepRef)] })), description && (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(progress_stepper_1.default.progressStepperStepDescription), children: description })] })] })));
};
exports.ProgressStep = ProgressStep;
exports.ProgressStep.displayName = 'ProgressStep';
//# sourceMappingURL=ProgressStep.js.map