"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WizardToggle = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const wizard_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Wizard/wizard"));
const angle_right_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-right-icon'));
const caret_down_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/caret-down-icon'));
const exclamation_circle_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/exclamation-circle-icon'));
const check_circle_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/check-circle-icon'));
const constants_1 = require("../../helpers/constants");
const types_1 = require("./types");
const WizardStep_1 = require("./WizardStep");
const WizardBody_1 = require("./WizardBody");
const WizardToggle = ({ steps, activeStep, footer, nav, isNavExpanded, toggleNavExpanded, 'aria-label': ariaLabel = 'Wizard toggle' }) => {
    const isActiveSubStep = (0, types_1.isWizardSubStep)(activeStep);
    const parentStep = isActiveSubStep && steps.find((step) => step.id === activeStep.parentId);
    const nonSubSteps = steps.filter((step) => !(0, types_1.isWizardSubStep)(step));
    const wizardToggleIndex = nonSubSteps.indexOf(parentStep || activeStep) + 1;
    const isActiveStepStatus = activeStep.status;
    const handleKeyClicks = (0, react_1.useCallback)((event) => {
        if (isNavExpanded && event.key === constants_1.KeyTypes.Escape) {
            toggleNavExpanded === null || toggleNavExpanded === void 0 ? void 0 : toggleNavExpanded(event);
        }
    }, [isNavExpanded, toggleNavExpanded]);
    // Open/close collapsable navigation on keydown event
    (0, react_1.useEffect)(() => {
        const target = typeof document !== 'undefined' ? document.body : null;
        target === null || target === void 0 ? void 0 : target.addEventListener('keydown', handleKeyClicks, false);
        return () => {
            target === null || target === void 0 ? void 0 : target.removeEventListener('keydown', handleKeyClicks, false);
        };
    }, [handleKeyClicks]);
    const bodyContent = steps.map((step) => {
        var _a;
        const props = ((_a = step.component) === null || _a === void 0 ? void 0 : _a.props) || {};
        const { children, body } = props, propsWithoutChildren = tslib_1.__rest(props, ["children", "body"]);
        return ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [(activeStep === null || activeStep === void 0 ? void 0 : activeStep.id) === step.id && (0, jsx_runtime_1.jsx)(WizardBody_1.WizardBody, Object.assign({}, body, { children: children })), (0, jsx_runtime_1.jsx)("div", { style: { display: 'none' }, children: (0, jsx_runtime_1.jsx)(WizardStep_1.WizardStep, Object.assign({}, propsWithoutChildren)) }, step.id)] }, step.id));
    });
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("button", { onClick: toggleNavExpanded, className: (0, react_styles_1.css)(wizard_1.default.wizardToggle, isNavExpanded && 'pf-m-expanded'), "aria-label": ariaLabel, "aria-expanded": isNavExpanded, children: [(0, jsx_runtime_1.jsxs)("span", { className: (0, react_styles_1.css)(wizard_1.default.wizardToggleList), children: [(0, jsx_runtime_1.jsxs)("span", { className: (0, react_styles_1.css)(wizard_1.default.wizardToggleListItem, isActiveStepStatus === 'error' && wizard_1.default.modifiers.danger, isActiveStepStatus === 'success' && wizard_1.default.modifiers.success), children: [isActiveStepStatus === 'error' && ((0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(wizard_1.default.wizardToggleStatusIcon), children: (0, jsx_runtime_1.jsx)(exclamation_circle_icon_1.default, {}) })), isActiveStepStatus === 'success' && ((0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(wizard_1.default.wizardToggleStatusIcon), children: (0, jsx_runtime_1.jsx)(check_circle_icon_1.default, {}) })), isActiveStepStatus !== 'success' && isActiveStepStatus !== 'error' && ((0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(wizard_1.default.wizardToggleNum), children: wizardToggleIndex })), ' ', (parentStep === null || parentStep === void 0 ? void 0 : parentStep.name) || (activeStep === null || activeStep === void 0 ? void 0 : activeStep.name), isActiveSubStep && (0, jsx_runtime_1.jsx)(angle_right_icon_1.default, { className: (0, react_styles_1.css)(wizard_1.default.wizardToggleSeparator) })] }), isActiveSubStep && (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(wizard_1.default.wizardToggleListItem), children: activeStep === null || activeStep === void 0 ? void 0 : activeStep.name })] }), (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(wizard_1.default.wizardToggleIcon), children: (0, jsx_runtime_1.jsx)(caret_down_icon_1.default, {}) })] }), (0, jsx_runtime_1.jsxs)("div", { className: (0, react_styles_1.css)(wizard_1.default.wizardOuterWrap), children: [(0, jsx_runtime_1.jsxs)("div", { className: (0, react_styles_1.css)(wizard_1.default.wizardInnerWrap), children: [nav, bodyContent] }), footer] })] }));
};
exports.WizardToggle = WizardToggle;
exports.WizardToggle.displayName = 'WizardToggle';
//# sourceMappingURL=WizardToggle.js.map