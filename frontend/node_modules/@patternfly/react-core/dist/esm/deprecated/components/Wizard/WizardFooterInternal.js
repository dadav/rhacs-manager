import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Wizard/wizard.mjs';
import { Button, ButtonVariant } from '../../../components/Button';
import { ActionList, ActionListGroup, ActionListItem } from '../../../components/ActionList';
export const WizardFooterInternal = ({ onNext, onBack, onClose, isValid, firstStep, activeStep, nextButtonText, backButtonText, cancelButtonText }) => (_jsx("footer", { className: css(styles.wizardFooter), children: _jsxs(ActionList, { children: [_jsxs(ActionListGroup, { children: [!activeStep.hideBackButton && (_jsx(ActionListItem, { children: _jsx(Button, { variant: ButtonVariant.secondary, onClick: onBack, isDisabled: firstStep, children: backButtonText }) })), _jsx(ActionListItem, { children: _jsx(Button, { variant: ButtonVariant.primary, type: "submit", onClick: onNext, isDisabled: !isValid, children: nextButtonText }) })] }), !activeStep.hideCancelButton && (_jsx(ActionListGroup, { children: _jsx(ActionListItem, { children: _jsx(Button, { variant: ButtonVariant.link, onClick: onClose, children: cancelButtonText }) }) }))] }) }));
WizardFooterInternal.displayName = 'WizardFooterInternal';
//# sourceMappingURL=WizardFooterInternal.js.map