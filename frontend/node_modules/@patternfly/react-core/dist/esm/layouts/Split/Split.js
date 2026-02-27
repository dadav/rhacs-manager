import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/layouts/Split/split.mjs';
import { css } from '@patternfly/react-styles';
export const Split = (_a) => {
    var { hasGutter = false, isWrappable = false, className = '', children = null, component = 'div' } = _a, props = __rest(_a, ["hasGutter", "isWrappable", "className", "children", "component"]);
    const Component = component;
    return (_jsx(Component, Object.assign({}, props, { className: css(styles.split, hasGutter && styles.modifiers.gutter, isWrappable && styles.modifiers.wrap, className), children: children })));
};
Split.displayName = 'Split';
//# sourceMappingURL=Split.js.map