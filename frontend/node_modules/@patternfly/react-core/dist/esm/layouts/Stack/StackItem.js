import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/layouts/Stack/stack.mjs';
import { css } from '@patternfly/react-styles';
export const StackItem = (_a) => {
    var { isFilled = false, className = '', children = null, component = 'div' } = _a, props = __rest(_a, ["isFilled", "className", "children", "component"]);
    const Component = component;
    return (_jsx(Component, Object.assign({}, props, { className: css(styles.stackItem, isFilled && styles.modifiers.fill, className), children: children })));
};
StackItem.displayName = 'StackItem';
//# sourceMappingURL=StackItem.js.map