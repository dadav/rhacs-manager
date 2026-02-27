import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from 'react';
import styles from '@patternfly/react-styles/css/components/ProgressStepper/progress-stepper.mjs';
import { css } from '@patternfly/react-styles';
import CheckCircleIcon from '@patternfly/react-icons/dist/esm/icons/check-circle-icon';
import ResourcesFullIcon from '@patternfly/react-icons/dist/esm/icons/resources-full-icon';
import ExclamationTriangleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-triangle-icon';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
export var ProgressStepVariant;
(function (ProgressStepVariant) {
    ProgressStepVariant["default"] = "default";
    ProgressStepVariant["pending"] = "pending";
    ProgressStepVariant["success"] = "success";
    ProgressStepVariant["info"] = "info";
    ProgressStepVariant["danger"] = "danger";
    ProgressStepVariant["warning"] = "warning";
})(ProgressStepVariant || (ProgressStepVariant = {}));
const variantIcons = {
    default: undefined,
    pending: undefined,
    success: _jsx(CheckCircleIcon, {}),
    info: _jsx(ResourcesFullIcon, {}),
    warning: _jsx(ExclamationTriangleIcon, {}),
    danger: _jsx(ExclamationCircleIcon, {})
};
const variantStyle = {
    default: '',
    info: styles.modifiers.info,
    success: styles.modifiers.success,
    pending: styles.modifiers.pending,
    warning: styles.modifiers.warning,
    danger: styles.modifiers.danger
};
export const ProgressStep = (_a) => {
    var { children, className, variant, isCurrent, description, icon, titleId, 'aria-label': ariaLabel, popoverRender } = _a, props = __rest(_a, ["children", "className", "variant", "isCurrent", "description", "icon", "titleId", 'aria-label', "popoverRender"]);
    const _icon = icon !== undefined ? icon : variantIcons[variant];
    const Component = popoverRender !== undefined ? 'button' : 'div';
    const stepRef = useRef(undefined);
    if (props.id === undefined || titleId === undefined) {
        /* eslint-disable no-console */
        console.warn('ProgressStep: The titleId and id properties are required to make this component accessible, and one or both of these properties are missing.');
    }
    return (_jsxs("li", Object.assign({ className: css(styles.progressStepperStep, variantStyle[variant], isCurrent && styles.modifiers.current, className), "aria-label": ariaLabel, 
        // CSS style `display: contents` gives this li a generic role, we need to override that
        role: "listitem" }, (isCurrent && { 'aria-current': 'step' }), props, { children: [_jsx("div", { className: css(styles.progressStepperStepConnector), children: _jsx("span", { className: css(styles.progressStepperStepIcon), children: _icon && _icon }) }), _jsxs("div", { className: css(styles.progressStepperStepMain), children: [_jsxs(Component, Object.assign({ className: css(styles.progressStepperStepTitle, popoverRender && styles.modifiers.helpText), id: titleId, ref: stepRef }, (popoverRender && { type: 'button' }), (props.id !== undefined &&
                        titleId !== undefined &&
                        popoverRender && { 'aria-labelledby': `${props.id} ${titleId}` }), { children: [children, popoverRender && popoverRender(stepRef)] })), description && _jsx("div", { className: css(styles.progressStepperStepDescription), children: description })] })] })));
};
ProgressStep.displayName = 'ProgressStep';
//# sourceMappingURL=ProgressStep.js.map