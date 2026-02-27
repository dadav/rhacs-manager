import { isValidElement } from 'react';
export var WizardNavItemStatus;
(function (WizardNavItemStatus) {
    WizardNavItemStatus["Default"] = "default";
    WizardNavItemStatus["Error"] = "error";
    WizardNavItemStatus["Success"] = "success";
})(WizardNavItemStatus || (WizardNavItemStatus = {}));
export var WizardStepChangeScope;
(function (WizardStepChangeScope) {
    WizardStepChangeScope["Next"] = "next";
    WizardStepChangeScope["Back"] = "back";
    WizardStepChangeScope["Nav"] = "nav";
})(WizardStepChangeScope || (WizardStepChangeScope = {}));
export function isCustomWizardNav(nav) {
    return typeof nav === 'function' || isValidElement(nav);
}
export function isCustomWizardNavItem(navItem) {
    return typeof navItem === 'function' || isValidElement(navItem);
}
export function isCustomWizardFooter(footer) {
    return typeof footer === 'function' || isValidElement(footer);
}
export function isWizardBasicStep(step) {
    return (step === null || step === void 0 ? void 0 : step.subStepIds) === undefined && !isWizardSubStep(step);
}
export function isWizardSubStep(step) {
    return (step === null || step === void 0 ? void 0 : step.parentId) !== undefined;
}
export function isWizardParentStep(step) {
    return (step === null || step === void 0 ? void 0 : step.subStepIds) !== undefined;
}
//# sourceMappingURL=types.js.map