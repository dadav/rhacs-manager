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
const WizardBody_1 = require("./WizardBody");
const WizardToggle = ({ isNavOpen, onNavToggle, nav, steps, activeStep, children, hasNoBodyPadding = false, 'aria-label': ariaLabel = 'Wizard Toggle', mainAriaLabelledBy = null, mainAriaLabel = null, isInPage = true, hasDrawer, isDrawerExpanded, onExpandDrawer }) => {
    let activeStepIndex;
    let activeStepName;
    let activeStepSubName;
    for (let i = 0; i < steps.length; i++) {
        if ((activeStep.id && steps[i].id === activeStep.id) || steps[i].name === activeStep.name) {
            activeStepIndex = i + 1;
            activeStepName = steps[i].name;
            break;
        }
        else if (steps[i].steps) {
            for (const step of steps[i].steps) {
                if ((activeStep.id && step.id === activeStep.id) || step.name === activeStep.name) {
                    activeStepIndex = i + 1;
                    activeStepName = steps[i].name;
                    activeStepSubName = step.name;
                    break;
                }
            }
        }
    }
    return ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("button", { onClick: () => onNavToggle(!isNavOpen), className: (0, react_styles_1.css)(wizard_1.default.wizardToggle, isNavOpen && 'pf-m-expanded'), "aria-label": ariaLabel, "aria-expanded": isNavOpen, children: [(0, jsx_runtime_1.jsxs)("span", { className: (0, react_styles_1.css)(wizard_1.default.wizardToggleList), children: [(0, jsx_runtime_1.jsxs)("span", { className: (0, react_styles_1.css)(wizard_1.default.wizardToggleListItem), children: [(0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(wizard_1.default.wizardToggleNum), children: activeStepIndex }), " ", activeStepName, activeStepSubName && (0, jsx_runtime_1.jsx)(angle_right_icon_1.default, { className: (0, react_styles_1.css)(wizard_1.default.wizardToggleSeparator) })] }), activeStepSubName && (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(wizard_1.default.wizardToggleListItem), children: activeStepSubName })] }), (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(wizard_1.default.wizardToggleIcon), children: (0, jsx_runtime_1.jsx)(caret_down_icon_1.default, {}) })] }), (0, jsx_runtime_1.jsxs)("div", { className: (0, react_styles_1.css)(wizard_1.default.wizardOuterWrap), children: [(0, jsx_runtime_1.jsxs)("div", { className: (0, react_styles_1.css)(wizard_1.default.wizardInnerWrap), children: [nav(isNavOpen), (0, jsx_runtime_1.jsxs)(WizardBody_1.WizardBody, { mainComponent: isInPage ? 'div' : 'main', "aria-label": mainAriaLabel, "aria-labelledby": mainAriaLabelledBy, hasNoBodyPadding: hasNoBodyPadding, activeStep: activeStep, isDrawerExpanded: isDrawerExpanded, onExpandDrawer: onExpandDrawer, hasDrawer: hasDrawer, children: [hasDrawer && !isDrawerExpanded && activeStep.drawerToggleButton, activeStep.component] })] }), children] })] }));
};
exports.WizardToggle = WizardToggle;
exports.WizardToggle.displayName = 'WizardToggle';
//# sourceMappingURL=WizardToggle.js.map