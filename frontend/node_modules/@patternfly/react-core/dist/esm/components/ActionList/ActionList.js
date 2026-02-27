import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/ActionList/action-list.mjs';
export const ActionList = (_a) => {
    var { children, isIconList, className } = _a, props = __rest(_a, ["children", "isIconList", "className"]);
    return (_jsx("div", Object.assign({ className: css(styles.actionList, isIconList && styles.modifiers.icons, className) }, props, { children: children })));
};
ActionList.displayName = 'ActionList';
//# sourceMappingURL=ActionList.js.map