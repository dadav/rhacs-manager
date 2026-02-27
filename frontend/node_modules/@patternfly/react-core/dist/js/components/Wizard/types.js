"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWizardParentStep = exports.isWizardSubStep = exports.isWizardBasicStep = exports.isCustomWizardFooter = exports.isCustomWizardNavItem = exports.isCustomWizardNav = exports.WizardStepChangeScope = exports.WizardNavItemStatus = void 0;
const react_1 = require("react");
var WizardNavItemStatus;
(function (WizardNavItemStatus) {
    WizardNavItemStatus["Default"] = "default";
    WizardNavItemStatus["Error"] = "error";
    WizardNavItemStatus["Success"] = "success";
})(WizardNavItemStatus || (exports.WizardNavItemStatus = WizardNavItemStatus = {}));
var WizardStepChangeScope;
(function (WizardStepChangeScope) {
    WizardStepChangeScope["Next"] = "next";
    WizardStepChangeScope["Back"] = "back";
    WizardStepChangeScope["Nav"] = "nav";
})(WizardStepChangeScope || (exports.WizardStepChangeScope = WizardStepChangeScope = {}));
function isCustomWizardNav(nav) {
    return typeof nav === 'function' || (0, react_1.isValidElement)(nav);
}
exports.isCustomWizardNav = isCustomWizardNav;
function isCustomWizardNavItem(navItem) {
    return typeof navItem === 'function' || (0, react_1.isValidElement)(navItem);
}
exports.isCustomWizardNavItem = isCustomWizardNavItem;
function isCustomWizardFooter(footer) {
    return typeof footer === 'function' || (0, react_1.isValidElement)(footer);
}
exports.isCustomWizardFooter = isCustomWizardFooter;
function isWizardBasicStep(step) {
    return (step === null || step === void 0 ? void 0 : step.subStepIds) === undefined && !isWizardSubStep(step);
}
exports.isWizardBasicStep = isWizardBasicStep;
function isWizardSubStep(step) {
    return (step === null || step === void 0 ? void 0 : step.parentId) !== undefined;
}
exports.isWizardSubStep = isWizardSubStep;
function isWizardParentStep(step) {
    return (step === null || step === void 0 ? void 0 : step.subStepIds) !== undefined;
}
exports.isWizardParentStep = isWizardParentStep;
//# sourceMappingURL=types.js.map