import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Banner/banner.mjs';
import { css } from '@patternfly/react-styles';
export const Banner = (_a) => {
    var { children, className, screenReaderText, isSticky = false, color, status } = _a, props = __rest(_a, ["children", "className", "screenReaderText", "isSticky", "color", "status"]);
    const getStatusOrColorModifier = () => {
        if (status) {
            return styles.modifiers[status];
        }
        if (color) {
            return styles.modifiers[color];
        }
    };
    return (_jsxs("div", Object.assign({ className: css(styles.banner, getStatusOrColorModifier(), isSticky && styles.modifiers.sticky, className) }, props, { children: [screenReaderText && _jsx("span", { className: "pf-v6-screen-reader", children: screenReaderText }), children] })));
};
Banner.displayName = 'Banner';
//# sourceMappingURL=Banner.js.map