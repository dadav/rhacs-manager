import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Wizard/wizard.mjs';
import { css } from '@patternfly/react-styles';
import { Button } from '../../../components/Button';
import TimesIcon from '@patternfly/react-icons/dist/esm/icons/times-icon';
export const WizardHeader = ({ onClose = () => undefined, title, description, hideClose, closeButtonAriaLabel, titleId, descriptionComponent: Component = 'div', descriptionId }) => (_jsxs("div", { className: css(styles.wizardHeader), children: [!hideClose && (_jsx("div", { className: css(styles.wizardClose), children: _jsx(Button, { variant: "plain", "aria-label": closeButtonAriaLabel, onClick: onClose, icon: _jsx(TimesIcon, {}) }) })), _jsx("div", { className: css(styles.wizardTitle), children: _jsx("h2", { className: css(styles.wizardTitleText), id: titleId, children: title || _jsx(_Fragment, { children: "\u00A0" }) }) }), description && (_jsx(Component, { className: css(styles.wizardDescription), id: descriptionId, children: description }))] }));
WizardHeader.displayName = 'WizardHeader';
//# sourceMappingURL=WizardHeader.js.map