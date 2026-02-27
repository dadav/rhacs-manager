import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useContext, useRef } from 'react';
import styles from '@patternfly/react-styles/css/components/TextInputGroup/text-input-group.mjs';
import { css } from '@patternfly/react-styles';
import { TextInputGroupContext } from './TextInputGroup';
import { TextInputGroupIcon } from './TextInputGroupIcon';
import { statusIcons, ValidatedOptions } from '../../helpers';
const TextInputGroupMainBase = (_a) => {
    var { children, className, icon, type = 'text', hint, onChange = () => undefined, onFocus, onBlur, 'aria-label': ariaLabel = 'Type to filter', value: inputValue, placeholder: inputPlaceHolder, innerRef, name, 'aria-activedescendant': ariaActivedescendant, role, isExpanded, 'aria-controls': ariaControls, inputId, inputProps } = _a, props = __rest(_a, ["children", "className", "icon", "type", "hint", "onChange", "onFocus", "onBlur", 'aria-label', "value", "placeholder", "innerRef", "name", 'aria-activedescendant', "role", "isExpanded", 'aria-controls', "inputId", "inputProps"]);
    const { isDisabled, validated } = useContext(TextInputGroupContext);
    const ref = useRef(null);
    const textInputGroupInputInputRef = innerRef || ref;
    const StatusIcon = statusIcons[validated === ValidatedOptions.error ? 'danger' : validated];
    const handleChange = (event) => {
        onChange(event, event.currentTarget.value);
    };
    return (_jsxs("div", Object.assign({ className: css(styles.textInputGroupMain, icon && styles.modifiers.icon, className) }, props, { children: [children, _jsxs("span", { className: css(styles.textInputGroupText), children: [hint && (_jsx("input", { className: css(styles.textInputGroupTextInput, styles.modifiers.hint), type: "text", disabled: true, "aria-hidden": "true", value: hint, id: inputId })), icon && _jsx(TextInputGroupIcon, { children: icon }), _jsx("input", Object.assign({ ref: textInputGroupInputInputRef, type: type, className: css(styles.textInputGroupTextInput), "aria-label": ariaLabel, disabled: isDisabled, onChange: handleChange, onFocus: onFocus, onBlur: onBlur, value: inputValue || '', placeholder: inputPlaceHolder, name: name, "aria-activedescendant": ariaActivedescendant, id: inputId }, (role && { role }), (isExpanded !== undefined && { 'aria-expanded': isExpanded }), (ariaControls && { 'aria-controls': ariaControls }), inputProps)), validated && _jsx(TextInputGroupIcon, { isStatus: true, children: _jsx(StatusIcon, {}) })] })] })));
};
export const TextInputGroupMain = forwardRef((props, ref) => (_jsx(TextInputGroupMainBase, Object.assign({ innerRef: ref }, props))));
TextInputGroupMain.displayName = 'TextInputGroupMain';
//# sourceMappingURL=TextInputGroupMain.js.map