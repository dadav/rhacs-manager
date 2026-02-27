import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Fragment, useCallback, useEffect } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Wizard/wizard.mjs';
import AngleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-right-icon';
import CaretDownIcon from '@patternfly/react-icons/dist/esm/icons/caret-down-icon';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import CheckCircleIcon from '@patternfly/react-icons/dist/esm/icons/check-circle-icon';
import { KeyTypes } from '../../helpers/constants';
import { isWizardSubStep } from './types';
import { WizardStep } from './WizardStep';
import { WizardBody } from './WizardBody';
export const WizardToggle = ({ steps, activeStep, footer, nav, isNavExpanded, toggleNavExpanded, 'aria-label': ariaLabel = 'Wizard toggle' }) => {
    const isActiveSubStep = isWizardSubStep(activeStep);
    const parentStep = isActiveSubStep && steps.find((step) => step.id === activeStep.parentId);
    const nonSubSteps = steps.filter((step) => !isWizardSubStep(step));
    const wizardToggleIndex = nonSubSteps.indexOf(parentStep || activeStep) + 1;
    const isActiveStepStatus = activeStep.status;
    const handleKeyClicks = useCallback((event) => {
        if (isNavExpanded && event.key === KeyTypes.Escape) {
            toggleNavExpanded === null || toggleNavExpanded === void 0 ? void 0 : toggleNavExpanded(event);
        }
    }, [isNavExpanded, toggleNavExpanded]);
    // Open/close collapsable navigation on keydown event
    useEffect(() => {
        const target = typeof document !== 'undefined' ? document.body : null;
        target === null || target === void 0 ? void 0 : target.addEventListener('keydown', handleKeyClicks, false);
        return () => {
            target === null || target === void 0 ? void 0 : target.removeEventListener('keydown', handleKeyClicks, false);
        };
    }, [handleKeyClicks]);
    const bodyContent = steps.map((step) => {
        var _a;
        const props = ((_a = step.component) === null || _a === void 0 ? void 0 : _a.props) || {};
        const { children, body } = props, propsWithoutChildren = __rest(props, ["children", "body"]);
        return (_jsxs(Fragment, { children: [(activeStep === null || activeStep === void 0 ? void 0 : activeStep.id) === step.id && _jsx(WizardBody, Object.assign({}, body, { children: children })), _jsx("div", { style: { display: 'none' }, children: _jsx(WizardStep, Object.assign({}, propsWithoutChildren)) }, step.id)] }, step.id));
    });
    return (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: toggleNavExpanded, className: css(styles.wizardToggle, isNavExpanded && 'pf-m-expanded'), "aria-label": ariaLabel, "aria-expanded": isNavExpanded, children: [_jsxs("span", { className: css(styles.wizardToggleList), children: [_jsxs("span", { className: css(styles.wizardToggleListItem, isActiveStepStatus === 'error' && styles.modifiers.danger, isActiveStepStatus === 'success' && styles.modifiers.success), children: [isActiveStepStatus === 'error' && (_jsx("span", { className: css(styles.wizardToggleStatusIcon), children: _jsx(ExclamationCircleIcon, {}) })), isActiveStepStatus === 'success' && (_jsx("span", { className: css(styles.wizardToggleStatusIcon), children: _jsx(CheckCircleIcon, {}) })), isActiveStepStatus !== 'success' && isActiveStepStatus !== 'error' && (_jsx("span", { className: css(styles.wizardToggleNum), children: wizardToggleIndex })), ' ', (parentStep === null || parentStep === void 0 ? void 0 : parentStep.name) || (activeStep === null || activeStep === void 0 ? void 0 : activeStep.name), isActiveSubStep && _jsx(AngleRightIcon, { className: css(styles.wizardToggleSeparator) })] }), isActiveSubStep && _jsx("span", { className: css(styles.wizardToggleListItem), children: activeStep === null || activeStep === void 0 ? void 0 : activeStep.name })] }), _jsx("span", { className: css(styles.wizardToggleIcon), children: _jsx(CaretDownIcon, {}) })] }), _jsxs("div", { className: css(styles.wizardOuterWrap), children: [_jsxs("div", { className: css(styles.wizardInnerWrap), children: [nav, bodyContent] }), footer] })] }));
};
WizardToggle.displayName = 'WizardToggle';
//# sourceMappingURL=WizardToggle.js.map