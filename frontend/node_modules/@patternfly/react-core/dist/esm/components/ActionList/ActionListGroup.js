import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/ActionList/action-list.mjs';
export const ActionListGroup = (_a) => {
    var { children, className, isIconGroup } = _a, props = __rest(_a, ["children", "className", "isIconGroup"]);
    return (_jsx("div", Object.assign({ className: css(styles.actionListGroup, isIconGroup && styles.modifiers.icons, className) }, props, { children: children })));
};
ActionListGroup.displayName = 'ActionListGroup';
//# sourceMappingURL=ActionListGroup.js.map