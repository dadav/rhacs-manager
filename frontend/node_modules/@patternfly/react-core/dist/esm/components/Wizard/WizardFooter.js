import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Wizard/wizard.mjs';
import { Button, ButtonVariant } from '../Button';
import { isCustomWizardFooter } from './types';
import { ActionList, ActionListGroup, ActionListItem } from '../ActionList';
export const WizardFooterWrapper = (_a) => {
    var { children, className } = _a, props = __rest(_a, ["children", "className"]);
    return (_jsx("footer", Object.assign({ className: css(styles.wizardFooter, className) }, props, { children: children })));
};
export const WizardFooter = (_a) => {
    var { activeStep } = _a, internalProps = __rest(_a, ["activeStep"]);
    const activeStepFooter = !isCustomWizardFooter(activeStep === null || activeStep === void 0 ? void 0 : activeStep.footer) && (activeStep === null || activeStep === void 0 ? void 0 : activeStep.footer);
    return _jsx(InternalWizardFooter, Object.assign({}, internalProps, activeStepFooter));
};
const InternalWizardFooter = (_a) => {
    var { onNext, onBack, onClose, isNextDisabled, isBackDisabled, isBackHidden, isCancelHidden, nextButtonText = 'Next', backButtonText = 'Back', cancelButtonText = 'Cancel', nextButtonProps, backButtonProps, cancelButtonProps, className } = _a, props = __rest(_a, ["onNext", "onBack", "onClose", "isNextDisabled", "isBackDisabled", "isBackHidden", "isCancelHidden", "nextButtonText", "backButtonText", "cancelButtonText", "nextButtonProps", "backButtonProps", "cancelButtonProps", "className"]);
    return (_jsx(WizardFooterWrapper, Object.assign({ className: className }, props, { children: _jsxs(ActionList, { children: [_jsxs(ActionListGroup, { children: [!isBackHidden && (_jsx(ActionListItem, { children: _jsx(Button, Object.assign({ variant: ButtonVariant.secondary, onClick: onBack, isDisabled: isBackDisabled }, backButtonProps, { children: backButtonText })) })), _jsx(ActionListItem, { children: _jsx(Button, Object.assign({ variant: ButtonVariant.primary, type: "submit", onClick: onNext, isDisabled: isNextDisabled }, nextButtonProps, { children: nextButtonText })) })] }), !isCancelHidden && (_jsx(ActionListGroup, { children: _jsx(ActionListItem, { children: _jsx(Button, Object.assign({ variant: ButtonVariant.link, onClick: onClose }, cancelButtonProps, { children: cancelButtonText })) }) }))] }) })));
};
WizardFooterWrapper.displayName = 'WizardFooterWrapper';
WizardFooter.displayName = 'WizardFooter';
//# sourceMappingURL=WizardFooter.js.map