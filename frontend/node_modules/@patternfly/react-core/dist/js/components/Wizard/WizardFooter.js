"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WizardFooter = exports.WizardFooterWrapper = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const wizard_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Wizard/wizard"));
const Button_1 = require("../Button");
const types_1 = require("./types");
const ActionList_1 = require("../ActionList");
const WizardFooterWrapper = (_a) => {
    var { children, className } = _a, props = tslib_1.__rest(_a, ["children", "className"]);
    return ((0, jsx_runtime_1.jsx)("footer", Object.assign({ className: (0, react_styles_1.css)(wizard_1.default.wizardFooter, className) }, props, { children: children })));
};
exports.WizardFooterWrapper = WizardFooterWrapper;
const WizardFooter = (_a) => {
    var { activeStep } = _a, internalProps = tslib_1.__rest(_a, ["activeStep"]);
    const activeStepFooter = !(0, types_1.isCustomWizardFooter)(activeStep === null || activeStep === void 0 ? void 0 : activeStep.footer) && (activeStep === null || activeStep === void 0 ? void 0 : activeStep.footer);
    return (0, jsx_runtime_1.jsx)(InternalWizardFooter, Object.assign({}, internalProps, activeStepFooter));
};
exports.WizardFooter = WizardFooter;
const InternalWizardFooter = (_a) => {
    var { onNext, onBack, onClose, isNextDisabled, isBackDisabled, isBackHidden, isCancelHidden, nextButtonText = 'Next', backButtonText = 'Back', cancelButtonText = 'Cancel', nextButtonProps, backButtonProps, cancelButtonProps, className } = _a, props = tslib_1.__rest(_a, ["onNext", "onBack", "onClose", "isNextDisabled", "isBackDisabled", "isBackHidden", "isCancelHidden", "nextButtonText", "backButtonText", "cancelButtonText", "nextButtonProps", "backButtonProps", "cancelButtonProps", "className"]);
    return ((0, jsx_runtime_1.jsx)(exports.WizardFooterWrapper, Object.assign({ className: className }, props, { children: (0, jsx_runtime_1.jsxs)(ActionList_1.ActionList, { children: [(0, jsx_runtime_1.jsxs)(ActionList_1.ActionListGroup, { children: [!isBackHidden && ((0, jsx_runtime_1.jsx)(ActionList_1.ActionListItem, { children: (0, jsx_runtime_1.jsx)(Button_1.Button, Object.assign({ variant: Button_1.ButtonVariant.secondary, onClick: onBack, isDisabled: isBackDisabled }, backButtonProps, { children: backButtonText })) })), (0, jsx_runtime_1.jsx)(ActionList_1.ActionListItem, { children: (0, jsx_runtime_1.jsx)(Button_1.Button, Object.assign({ variant: Button_1.ButtonVariant.primary, type: "submit", onClick: onNext, isDisabled: isNextDisabled }, nextButtonProps, { children: nextButtonText })) })] }), !isCancelHidden && ((0, jsx_runtime_1.jsx)(ActionList_1.ActionListGroup, { children: (0, jsx_runtime_1.jsx)(ActionList_1.ActionListItem, { children: (0, jsx_runtime_1.jsx)(Button_1.Button, Object.assign({ variant: Button_1.ButtonVariant.link, onClick: onClose }, cancelButtonProps, { children: cancelButtonText })) }) }))] }) })));
};
exports.WizardFooterWrapper.displayName = 'WizardFooterWrapper';
exports.WizardFooter.displayName = 'WizardFooter';
//# sourceMappingURL=WizardFooter.js.map