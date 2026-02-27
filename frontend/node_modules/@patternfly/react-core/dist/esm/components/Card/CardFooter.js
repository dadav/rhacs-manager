import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Card/card.mjs';
import { css } from '@patternfly/react-styles';
export const CardFooter = (_a) => {
    var { children, className, component = 'div' } = _a, props = __rest(_a, ["children", "className", "component"]);
    const Component = component;
    return (_jsx(Component, Object.assign({ className: css(styles.cardFooter, className) }, props, { children: children })));
};
CardFooter.displayName = 'CardFooter';
//# sourceMappingURL=CardFooter.js.map