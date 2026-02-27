import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/NotificationDrawer/notification-drawer.mjs';
export const NotificationDrawerListItemBody = (_a) => {
    var { children, className = '', timestamp } = _a, props = __rest(_a, ["children", "className", "timestamp"]);
    return (_jsxs(Fragment, { children: [_jsx("div", Object.assign({}, props, { className: css(styles.notificationDrawerListItemDescription, className), children: children })), timestamp && _jsx("div", { className: css(styles.notificationDrawerListItemTimestamp, className), children: timestamp })] }));
};
NotificationDrawerListItemBody.displayName = 'NotificationDrawerListItemBody';
//# sourceMappingURL=NotificationDrawerListItemBody.js.map