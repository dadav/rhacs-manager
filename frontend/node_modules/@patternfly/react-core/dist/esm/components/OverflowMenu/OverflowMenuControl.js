import { __rest } from "tslib";
import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/OverflowMenu/overflow-menu.mjs';
import { OverflowMenuContext } from './OverflowMenuContext';
export const OverflowMenuControl = (_a) => {
    var { className, children, hasAdditionalOptions } = _a, props = __rest(_a, ["className", "children", "hasAdditionalOptions"]);
    return (_jsx(OverflowMenuContext.Consumer, { children: (value) => (value.isBelowBreakpoint || hasAdditionalOptions) && (_jsxs("div", Object.assign({ className: css(styles.overflowMenuControl, className) }, props, { children: [' ', children, ' '] }))) }));
};
OverflowMenuControl.displayName = 'OverflowMenuControl';
//# sourceMappingURL=OverflowMenuControl.js.map