import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Wizard/wizard.mjs';
import AngleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-right-icon';
import CaretDownIcon from '@patternfly/react-icons/dist/esm/icons/caret-down-icon';
import { WizardBody } from './WizardBody';
export const WizardToggle = ({ isNavOpen, onNavToggle, nav, steps, activeStep, children, hasNoBodyPadding = false, 'aria-label': ariaLabel = 'Wizard Toggle', mainAriaLabelledBy = null, mainAriaLabel = null, isInPage = true, hasDrawer, isDrawerExpanded, onExpandDrawer }) => {
    let activeStepIndex;
    let activeStepName;
    let activeStepSubName;
    for (let i = 0; i < steps.length; i++) {
        if ((activeStep.id && steps[i].id === activeStep.id) || steps[i].name === activeStep.name) {
            activeStepIndex = i + 1;
            activeStepName = steps[i].name;
            break;
        }
        else if (steps[i].steps) {
            for (const step of steps[i].steps) {
                if ((activeStep.id && step.id === activeStep.id) || step.name === activeStep.name) {
                    activeStepIndex = i + 1;
                    activeStepName = steps[i].name;
                    activeStepSubName = step.name;
                    break;
                }
            }
        }
    }
    return (_jsxs(Fragment, { children: [_jsxs("button", { onClick: () => onNavToggle(!isNavOpen), className: css(styles.wizardToggle, isNavOpen && 'pf-m-expanded'), "aria-label": ariaLabel, "aria-expanded": isNavOpen, children: [_jsxs("span", { className: css(styles.wizardToggleList), children: [_jsxs("span", { className: css(styles.wizardToggleListItem), children: [_jsx("span", { className: css(styles.wizardToggleNum), children: activeStepIndex }), " ", activeStepName, activeStepSubName && _jsx(AngleRightIcon, { className: css(styles.wizardToggleSeparator) })] }), activeStepSubName && _jsx("span", { className: css(styles.wizardToggleListItem), children: activeStepSubName })] }), _jsx("span", { className: css(styles.wizardToggleIcon), children: _jsx(CaretDownIcon, {}) })] }), _jsxs("div", { className: css(styles.wizardOuterWrap), children: [_jsxs("div", { className: css(styles.wizardInnerWrap), children: [nav(isNavOpen), _jsxs(WizardBody, { mainComponent: isInPage ? 'div' : 'main', "aria-label": mainAriaLabel, "aria-labelledby": mainAriaLabelledBy, hasNoBodyPadding: hasNoBodyPadding, activeStep: activeStep, isDrawerExpanded: isDrawerExpanded, onExpandDrawer: onExpandDrawer, hasDrawer: hasDrawer, children: [hasDrawer && !isDrawerExpanded && activeStep.drawerToggleButton, activeStep.component] })] }), children] })] }));
};
WizardToggle.displayName = 'WizardToggle';
//# sourceMappingURL=WizardToggle.js.map