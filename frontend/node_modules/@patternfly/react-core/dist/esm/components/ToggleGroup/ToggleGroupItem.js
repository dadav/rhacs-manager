import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/ToggleGroup/toggle-group.mjs';
import { ToggleGroupItemVariant, ToggleGroupItemElement } from './ToggleGroupItemElement';
export const ToggleGroupItem = (_a) => {
    var { text, icon, iconPosition = 'start', className, isDisabled = false, isSelected = false, 'aria-label': ariaLabel, onChange = () => { }, buttonId } = _a, props = __rest(_a, ["text", "icon", "iconPosition", "className", "isDisabled", "isSelected", 'aria-label', "onChange", "buttonId"]);
    const handleChange = (event) => {
        onChange(event, !isSelected);
    };
    if (!ariaLabel && icon && !text) {
        /* eslint-disable no-console */
        console.warn('An accessible aria-label is required when using the toggle group item icon variant.');
    }
    const toggleGroupIcon = _jsx(ToggleGroupItemElement, { variant: ToggleGroupItemVariant.icon, children: icon });
    return (_jsx("div", Object.assign({ className: css(styles.toggleGroupItem, className) }, props, { children: _jsxs("button", { type: "button", className: css(styles.toggleGroupButton, isSelected && styles.modifiers.selected), "aria-pressed": isSelected, onClick: handleChange, "aria-label": ariaLabel, disabled: isDisabled, id: buttonId, children: [icon && iconPosition === 'start' && toggleGroupIcon, text && _jsx(ToggleGroupItemElement, { variant: ToggleGroupItemVariant.text, children: text }), icon && iconPosition === 'end' && toggleGroupIcon] }) })));
};
ToggleGroupItem.displayName = 'ToggleGroupItem';
//# sourceMappingURL=ToggleGroupItem.js.map