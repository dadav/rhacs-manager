import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Badge/badge.mjs';
export const Badge = (_a) => {
    var { isRead = false, isDisabled = false, className = '', children = '', screenReaderText } = _a, props = __rest(_a, ["isRead", "isDisabled", "className", "children", "screenReaderText"]);
    return (_jsxs("span", Object.assign({}, props, { className: css(styles.badge, (isRead ? styles.modifiers.read : styles.modifiers.unread), isDisabled && styles.modifiers.disabled, className), children: [children, screenReaderText && _jsx("span", { className: "pf-v6-screen-reader", children: screenReaderText })] })));
};
Badge.displayName = 'Badge';
//# sourceMappingURL=Badge.js.map