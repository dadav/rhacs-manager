import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Wizard/wizard.mjs';
import { css } from '@patternfly/react-styles';
export const WizardNav = (_a) => {
    var { children, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, isExpanded = false, isInnerList = false, className } = _a, props = __rest(_a, ["children", 'aria-label', 'aria-labelledby', "isExpanded", "isInnerList", "className"]);
    if (isInnerList) {
        return (_jsx("ol", Object.assign({ className: css(styles.wizardNavList, className), role: "list" }, props, { children: children })));
    }
    return (_jsx("nav", Object.assign({ className: css(styles.wizardNav, isExpanded && styles.modifiers.expanded, className), "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy }, props, { children: _jsx("ol", { className: css(styles.wizardNavList), role: "list", children: children }) })));
};
WizardNav.displayName = 'WizardNav';
//# sourceMappingURL=WizardNav.js.map