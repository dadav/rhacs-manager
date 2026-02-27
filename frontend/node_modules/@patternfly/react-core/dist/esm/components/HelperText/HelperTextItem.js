import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/HelperText/helper-text.mjs';
import { css } from '@patternfly/react-styles';
import MinusIcon from '@patternfly/react-icons/dist/esm/icons/minus-icon';
import ExclamationTriangleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-triangle-icon';
import CheckCircleIcon from '@patternfly/react-icons/dist/esm/icons/check-circle-icon';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
export var HelperTextItemVariant;
(function (HelperTextItemVariant) {
    HelperTextItemVariant["default"] = "default";
    HelperTextItemVariant["warning"] = "warning";
    HelperTextItemVariant["error"] = "error";
    HelperTextItemVariant["success"] = "success";
})(HelperTextItemVariant || (HelperTextItemVariant = {}));
const defaultVariantIcons = {
    indeterminate: _jsx(MinusIcon, {}),
    warning: _jsx(ExclamationTriangleIcon, {}),
    success: _jsx(CheckCircleIcon, {}),
    error: _jsx(ExclamationCircleIcon, {})
};
export const HelperTextItem = (_a) => {
    var { children, className, component = 'div', variant = 'default', icon, id, screenReaderText = `${variant} status` } = _a, props = __rest(_a, ["children", "className", "component", "variant", "icon", "id", "screenReaderText"]);
    const Component = component;
    const isNotDefaultVariant = variant !== 'default';
    const defaultIcon = isNotDefaultVariant && defaultVariantIcons[variant];
    const shouldRenderSRText = isNotDefaultVariant && screenReaderText && screenReaderText !== '';
    return (_jsxs(Component, Object.assign({ className: css(styles.helperTextItem, isNotDefaultVariant && styles.modifiers[variant], className), id: id }, props, { children: [(defaultIcon || icon) && _jsx("span", { className: css(styles.helperTextItemIcon), children: icon || defaultIcon }), _jsxs("span", { className: css(styles.helperTextItemText), children: [children, shouldRenderSRText && _jsxs("span", { className: "pf-v6-screen-reader", children: [": ", screenReaderText, ";"] })] })] })));
};
HelperTextItem.displayName = 'HelperTextItem';
//# sourceMappingURL=HelperTextItem.js.map