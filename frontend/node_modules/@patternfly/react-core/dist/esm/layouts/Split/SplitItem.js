import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/layouts/Split/split.mjs';
import { css } from '@patternfly/react-styles';
export const SplitItem = (_a) => {
    var { isFilled = false, className = '', children = null, component = 'div' } = _a, props = __rest(_a, ["isFilled", "className", "children", "component"]);
    const Component = component;
    return (_jsx(Component, Object.assign({}, props, { className: css(styles.splitItem, isFilled && styles.modifiers.fill, className), children: children })));
};
SplitItem.displayName = 'SplitItem';
//# sourceMappingURL=SplitItem.js.map