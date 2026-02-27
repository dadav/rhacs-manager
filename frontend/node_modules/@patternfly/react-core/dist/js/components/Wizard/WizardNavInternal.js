"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WizardNavInternal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const types_1 = require("./types");
const WizardContext_1 = require("./WizardContext");
const WizardNav_1 = require("./WizardNav");
const WizardNavItem_1 = require("./WizardNavItem");
const WizardNavInternal = ({ nav, navAriaLabel, isVisitRequired, isProgressive, isNavExpanded }) => {
    const { activeStep, steps, goToStepByIndex } = (0, WizardContext_1.useWizardContext)();
    const wizardNavProps = Object.assign({ isExpanded: isNavExpanded, 'aria-label': navAriaLabel || (nav === null || nav === void 0 ? void 0 : nav['aria-label']) || 'Wizard steps' }, ((nav === null || nav === void 0 ? void 0 : nav['aria-labelledby']) && {
        'aria-labelledby': nav['aria-labelledby']
    }));
    return ((0, jsx_runtime_1.jsx)(WizardNav_1.WizardNav, Object.assign({}, wizardNavProps, { children: steps.map((step, stepIndex) => {
            var _a;
            const hasVisitedNextStep = steps.some((step) => step.index > stepIndex + 1 && step.isVisited);
            const isStepDisabled = step.isDisabled || (isVisitRequired && !step.isVisited && !hasVisitedNextStep);
            const customStepNavItem = (0, types_1.isCustomWizardNavItem)(step.navItem) && ((0, jsx_runtime_1.jsx)(react_1.Fragment, { children: typeof step.navItem === 'function' ? step.navItem(step, activeStep, steps, goToStepByIndex) : step.navItem }, step.id));
            if ((0, types_1.isWizardParentStep)(step) && !step.isHidden) {
                let firstSubStepIndex;
                let hasActiveChild = false;
                const subNavItems = (_a = step.subStepIds) === null || _a === void 0 ? void 0 : _a.map((subStepId, _subStepIndex) => {
                    const subStep = steps.find((step) => step.id === subStepId);
                    const hasVisitedNextStep = steps.some((step) => step.index > subStep.index && step.isVisited);
                    const isSubStepDisabled = subStep.isDisabled || (isVisitRequired && !subStep.isVisited && !hasVisitedNextStep);
                    const customSubStepNavItem = (0, types_1.isCustomWizardNavItem)(subStep.navItem) && ((0, jsx_runtime_1.jsx)(react_1.Fragment, { children: typeof subStep.navItem === 'function'
                            ? subStep.navItem(subStep, activeStep, steps, goToStepByIndex)
                            : subStep.navItem }, subStep.id));
                    // Don't render the sub-step navigation item if the hidden property is enabled
                    if (subStep.isHidden) {
                        return;
                    }
                    // Store the first visible sub-step index so that when its parent is clicked, the first sub-step is focused
                    if (firstSubStepIndex === undefined) {
                        firstSubStepIndex = subStep.index;
                    }
                    // When a sub-step is active, use this flag to set the parent step as active (isCurrent)
                    if ((activeStep === null || activeStep === void 0 ? void 0 : activeStep.id) === subStep.id) {
                        hasActiveChild = true;
                    }
                    if (!isProgressive || (isProgressive && subStep.index <= activeStep.index)) {
                        return (customSubStepNavItem || ((0, jsx_runtime_1.jsx)(WizardNavItem_1.WizardNavItem, Object.assign({ id: subStep.id, content: subStep.name, isCurrent: (activeStep === null || activeStep === void 0 ? void 0 : activeStep.id) === subStep.id, isDisabled: isSubStepDisabled || isStepDisabled, isVisited: subStep.isVisited, stepIndex: subStep.index, onClick: () => goToStepByIndex(subStep.index), status: subStep.status }, subStep.navItem), subStep.id)));
                    }
                });
                const hasEnabledChildren = react_1.Children.toArray(subNavItems).some((child) => (0, react_1.isValidElement)(child) && !child.props.isDisabled);
                if (!isProgressive || (isProgressive && step.index <= activeStep.index)) {
                    return (customStepNavItem || ((0, jsx_runtime_1.jsx)(WizardNavItem_1.WizardNavItem, Object.assign({ id: step.id, content: step.name, isExpandable: step.isExpandable, isCurrent: hasActiveChild, isDisabled: !hasEnabledChildren || isStepDisabled, isVisited: step.isVisited, stepIndex: firstSubStepIndex, onClick: () => goToStepByIndex(firstSubStepIndex), status: step.status }, step.navItem, { children: (0, jsx_runtime_1.jsx)(WizardNav_1.WizardNav, Object.assign({}, wizardNavProps, { isInnerList: true, children: subNavItems })) }), step.id)));
                }
            }
            if ((0, types_1.isWizardBasicStep)(step) &&
                !step.isHidden &&
                (!isProgressive || (isProgressive && step.index <= activeStep.index))) {
                return (customStepNavItem || ((0, jsx_runtime_1.jsx)(WizardNavItem_1.WizardNavItem, Object.assign({ id: step.id, content: step.name, isCurrent: (activeStep === null || activeStep === void 0 ? void 0 : activeStep.id) === step.id, isDisabled: isStepDisabled, isVisited: step.isVisited, stepIndex: step.index, onClick: () => goToStepByIndex(step.index), status: step.status }, step.navItem), step.id)));
            }
        }) })));
};
exports.WizardNavInternal = WizardNavInternal;
//# sourceMappingURL=WizardNavInternal.js.map