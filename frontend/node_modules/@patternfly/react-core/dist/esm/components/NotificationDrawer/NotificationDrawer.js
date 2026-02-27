import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from 'react';
import styles from '@patternfly/react-styles/css/components/NotificationDrawer/notification-drawer.mjs';
import { css } from '@patternfly/react-styles';
const NotificationDrawerBase = (_a) => {
    var { children, className = '', innerRef } = _a, props = __rest(_a, ["children", "className", "innerRef"]);
    return (_jsx("div", Object.assign({ ref: innerRef }, props, { className: css(styles.notificationDrawer, className), children: children })));
};
export const NotificationDrawer = forwardRef((props, ref) => (_jsx(NotificationDrawerBase, Object.assign({ innerRef: ref }, props))));
NotificationDrawer.displayName = 'NotificationDrawer';
//# sourceMappingURL=NotificationDrawer.js.map