import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/NotificationDrawer/notification-drawer.mjs';
export const NotificationDrawerList = (_a) => {
    var { children, className = '', isHidden = false, 'aria-label': ariaLabel } = _a, props = __rest(_a, ["children", "className", "isHidden", 'aria-label']);
    return (_jsx("ul", Object.assign({}, props, { className: css(`${styles.notificationDrawer}__list`, className), hidden: isHidden, role: "list", "aria-label": ariaLabel, children: children })));
};
NotificationDrawerList.displayName = 'NotificationDrawerList';
//# sourceMappingURL=NotificationDrawerList.js.map