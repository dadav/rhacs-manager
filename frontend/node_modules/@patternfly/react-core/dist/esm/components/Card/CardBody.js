import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Card/card.mjs';
import { css } from '@patternfly/react-styles';
export const CardBody = (_a) => {
    var { children, className, component = 'div', isFilled = true } = _a, props = __rest(_a, ["children", "className", "component", "isFilled"]);
    const Component = component;
    return (_jsx(Component, Object.assign({ className: css(styles.cardBody, !isFilled && styles.modifiers.noFill, className) }, props, { children: children })));
};
CardBody.displayName = 'CardBody';
//# sourceMappingURL=CardBody.js.map