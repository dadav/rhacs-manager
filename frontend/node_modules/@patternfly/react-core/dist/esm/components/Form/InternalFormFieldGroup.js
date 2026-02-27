import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Form/form.mjs';
import { css } from '@patternfly/react-styles';
import { FormFieldGroupToggle } from './FormFieldGroupToggle';
import { GenerateId } from '../../helpers';
import { useHasAnimations } from '../../helpers';
export const InternalFormFieldGroup = (_a) => {
    var { children, className, header, isExpandable, isExpanded, onToggle, toggleAriaLabel, hasAnimations: hasAnimationsProp } = _a, props = __rest(_a, ["children", "className", "header", "isExpandable", "isExpanded", "onToggle", "toggleAriaLabel", "hasAnimations"]);
    const hasAnimations = useHasAnimations(hasAnimationsProp);
    const headerTitleText = header ? header.props.titleText : null;
    if (isExpandable && !toggleAriaLabel && !headerTitleText) {
        // eslint-disable-next-line no-console
        console.error('FormFieldGroupExpandable:', 'toggleAriaLabel or the titleText prop of FormFieldGroupHeader is required to make the toggle button accessible');
    }
    return (_jsxs("div", Object.assign({ className: css(styles.formFieldGroup, isExpanded && isExpandable && styles.modifiers.expanded, hasAnimations && isExpandable && styles.modifiers.expandable, className), role: "group" }, (headerTitleText && { 'aria-labelledby': `${header.props.titleText.id}` }), props, { children: [isExpandable && (_jsx(GenerateId, { prefix: "form-field-group-toggle", children: (id) => (_jsx(FormFieldGroupToggle, Object.assign({ onToggle: onToggle, isExpanded: isExpanded, "aria-label": toggleAriaLabel, toggleId: id }, (headerTitleText && { 'aria-labelledby': `${header.props.titleText.id} ${id}` })))) })), header && header, (!isExpandable || (isExpandable && isExpanded) || (hasAnimations && isExpandable)) && (_jsx("div", Object.assign({ className: css(styles.formFieldGroupBody) }, (hasAnimations && isExpandable && !isExpanded && { inert: '' }), { children: children })))] })));
};
InternalFormFieldGroup.displayName = 'InternalFormFieldGroup';
//# sourceMappingURL=InternalFormFieldGroup.js.map