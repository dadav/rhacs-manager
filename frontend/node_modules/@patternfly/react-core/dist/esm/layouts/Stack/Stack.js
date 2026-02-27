import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/layouts/Stack/stack.mjs';
import { css } from '@patternfly/react-styles';
export const Stack = (_a) => {
    var { hasGutter = false, className = '', children = null, component = 'div' } = _a, props = __rest(_a, ["hasGutter", "className", "children", "component"]);
    const Component = component;
    return (_jsx(Component, Object.assign({}, props, { className: css(styles.stack, hasGutter && styles.modifiers.gutter, className), children: children })));
};
Stack.displayName = 'Stack';
//# sourceMappingURL=Stack.js.map