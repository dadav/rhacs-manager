"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WizardFooterInternal = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const wizard_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Wizard/wizard"));
const Button_1 = require("../../../components/Button");
const ActionList_1 = require("../../../components/ActionList");
const WizardFooterInternal = ({ onNext, onBack, onClose, isValid, firstStep, activeStep, nextButtonText, backButtonText, cancelButtonText }) => ((0, jsx_runtime_1.jsx)("footer", { className: (0, react_styles_1.css)(wizard_1.default.wizardFooter), children: (0, jsx_runtime_1.jsxs)(ActionList_1.ActionList, { children: [(0, jsx_runtime_1.jsxs)(ActionList_1.ActionListGroup, { children: [!activeStep.hideBackButton && ((0, jsx_runtime_1.jsx)(ActionList_1.ActionListItem, { children: (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: Button_1.ButtonVariant.secondary, onClick: onBack, isDisabled: firstStep, children: backButtonText }) })), (0, jsx_runtime_1.jsx)(ActionList_1.ActionListItem, { children: (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: Button_1.ButtonVariant.primary, type: "submit", onClick: onNext, isDisabled: !isValid, children: nextButtonText }) })] }), !activeStep.hideCancelButton && ((0, jsx_runtime_1.jsx)(ActionList_1.ActionListGroup, { children: (0, jsx_runtime_1.jsx)(ActionList_1.ActionListItem, { children: (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: Button_1.ButtonVariant.link, onClick: onClose, children: cancelButtonText }) }) }))] }) }));
exports.WizardFooterInternal = WizardFooterInternal;
exports.WizardFooterInternal.displayName = 'WizardFooterInternal';
//# sourceMappingURL=WizardFooterInternal.js.map