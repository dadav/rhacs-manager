import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Wizard/wizard.mjs';
import { css } from '@patternfly/react-styles';
import { useOUIAProps } from '../../../helpers';
export const WizardNav = ({ children, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, isOpen = false, returnList = false, ouiaId, ouiaSafe = true }) => {
    const ouiaProps = useOUIAProps(WizardNav.displayName, ouiaId, ouiaSafe);
    const innerList = (_jsx("ol", { className: css(styles.wizardNavList), role: "list", children: children }));
    if (returnList) {
        return innerList;
    }
    return (_jsx("nav", Object.assign({ className: css(styles.wizardNav, isOpen && styles.modifiers.expanded), "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy }, ouiaProps, { children: _jsx("ol", { className: css(styles.wizardNavList), role: "list", children: children }) })));
};
WizardNav.displayName = 'WizardNav';
//# sourceMappingURL=WizardNav.js.map