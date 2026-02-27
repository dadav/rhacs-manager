import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/OverflowMenu/overflow-menu.mjs';
import { OverflowMenuContext } from './OverflowMenuContext';
export const OverflowMenuGroup = (_a) => {
    var { className, children, isPersistent = false, groupType } = _a, props = __rest(_a, ["className", "children", "isPersistent", "groupType"]);
    return (_jsx(OverflowMenuContext.Consumer, { children: (value) => (isPersistent || !value.isBelowBreakpoint) && (_jsx("div", Object.assign({ className: css(styles.overflowMenuGroup, groupType === 'button' && styles.modifiers.buttonGroup, groupType === 'icon' && styles.modifiers.iconButtonGroup, className) }, props, { children: children }))) }));
};
OverflowMenuGroup.displayName = 'OverflowMenuGroup';
//# sourceMappingURL=OverflowMenuGroup.js.map