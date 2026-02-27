import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/ActionList/action-list.mjs';
export const ActionListItem = (_a) => {
    var { children, className } = _a, props = __rest(_a, ["children", "className"]);
    return (_jsx("div", Object.assign({ className: css(`${styles.actionList}__item`, className) }, props, { children: children })));
};
ActionListItem.displayName = 'ActionListItem';
//# sourceMappingURL=ActionListItem.js.map